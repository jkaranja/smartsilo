import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { auth } from '@saas/auth'
import { resolveTenant, withTenant, controlPlane } from '@saas/db'
import { getPermissions } from '@saas/auth/rbac'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from './server-host'
import { oauthRoutes } from './oauth'
import { dcrRoutes } from './dcr'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// https://better-auth.com/docs/plugins/oauth-provider

const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .use(cors())
  .use(oauthRoutes)
  .use(dcrRoutes)

  // Built-in copilot — authenticated via Better Auth session
  .post('/mcp/:tenantSlug', async ({ params, request, set }: { params: { tenantSlug: string }; request: Request; set: { status: number } }) => {
    const tenant = await resolveTenant(params.tenantSlug)

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      set.status = 401
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const membership = await withTenant(tenant.id, tenant.connectionKey, async (db) => {
      return (db as any)
        .selectFrom('tenant_memberships')
        .innerJoin('users', 'users.id', 'tenant_memberships.user_id')
        .select(['tenant_memberships.role'])
        .where('users.better_auth_id', '=', session.user.id)
        .executeTakeFirst()
    })

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this tenant' }), { status: 403 })
    }

    const permissions = getPermissions(membership.role)
    const mcpServer = await createMcpServer(
      tenant.id,
      tenant.connectionKey,
      tenant.industry,
      tenant.plan,
      membership.role,
      permissions,
    )

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    })
    await mcpServer.connect(transport)
    return transport.handleRequest(request)
  })

  // External AI clients — authenticated via MCP token
  .post('/mcp/external/:tenantSlug', async ({ params, request }: { params: { tenantSlug: string }; request: Request }) => {
    const authHeader = request.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Bearer token' }), { status: 401 })
    }

    const tokenHash = await sha256Hex(token)

    const tokenRow = await controlPlane
      .selectFrom('mcp_tokens')
      .select(['id', 'tenant_id', 'scopes'])
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .executeTakeFirst()

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: 'Invalid or revoked token' }), { status: 401 })
    }

    const tenant = await resolveTenant(params.tenantSlug)

    if (tokenRow.tenant_id !== tenant.id) {
      return new Response(JSON.stringify({ error: 'Token does not belong to this tenant' }), { status: 403 })
    }

    // Update last_used_at asynchronously — don't block the response
    controlPlane
      .updateTable('mcp_tokens')
      .set({ last_used_at: new Date() })
      .where('id', '=', tokenRow.id)
      .execute()
      .catch(() => {})

    // Token scopes ARE the permissions
    const permissions = tokenRow.scopes as string[]

    const mcpServer = await createMcpServer(
      tenant.id,
      tenant.connectionKey,
      tenant.industry,
      tenant.plan,
      'external',
      permissions,
    )

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    })
    await mcpServer.connect(transport)
    return transport.handleRequest(request)
  })

app.listen(Number(process.env.MCP_PORT ?? 3001), () => {
  console.log(`MCP server running on port ${process.env.MCP_PORT ?? 3001}`)
})
