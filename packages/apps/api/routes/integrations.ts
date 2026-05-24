import { Elysia, t } from 'elysia'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import { withTenant } from '@saas/db'

export const integrationRoutes = new Elysia({ prefix: '/integrations' })
  .use(gatewayMiddleware)

  // List connected external MCP servers
  .get('/mcp', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'integrations:read')

    return withTenant(tenantId, connectionKey, async (db) => {
      return db
        .selectFrom('external_mcp_servers')
        .select(['id', 'name', 'server_url', 'is_active', 'connected_at'])
        .orderBy('name')
        .execute()
    })
  })

  // Connect a new external MCP server
  .post('/mcp', async ({ body, tenantId, connectionKey, userId, role, set }) => {
    requirePermission(role, 'integrations:manage')

    const { name, serverUrl, authToken, scopes } = body

    // Validate server is reachable before saving
    try {
      const transport = new StreamableHTTPClientTransport(
        new URL(serverUrl),
        authToken
          ? { requestInit: { headers: { Authorization: `Bearer ${authToken}` } } }
          : undefined,
      )
      const client = new Client(
        { name: 'validation-client', version: '1.0.0' },
        { capabilities: { tools: {} } },
      )
      await client.connect(transport)
      await client.listTools()
      await client.close()
    } catch {
      set.status = 422
      return { error: 'Could not connect to MCP server. Check the URL and token.' }
    }

    const server = await withTenant(tenantId, connectionKey, async (db) => {
      return db
        .insertInto('external_mcp_servers')
        .values({
          id:           crypto.randomUUID(),
          tenant_id:    tenantId,
          name,
          server_url:   serverUrl,
          auth_token:   authToken ?? null,
          scopes:       scopes ?? [],
          is_active:    true,
          connected_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    })

    return { message: `${name} connected`, id: server.id }
  }, {
    body: t.Object({
      name:      t.String(),
      serverUrl: t.String(),
      authToken: t.Optional(t.String()),
      scopes:    t.Optional(t.Array(t.String())),
    }),
  })

  // Disconnect an external MCP server
  .delete('/mcp/:id', async ({ params, tenantId, connectionKey, role }) => {
    requirePermission(role, 'integrations:manage')

    await withTenant(tenantId, connectionKey, async (db) => {
      await db
        .deleteFrom('external_mcp_servers')
        .where('id', '=', params.id)
        .execute()
    })

    return { message: 'Disconnected' }
  })
