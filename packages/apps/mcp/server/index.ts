import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { mcpHandler, getAuthenticatedUser } from '@saas/auth'
import { getMcpConfig } from '../config'
import { createServer } from './mcp/server'
import { initServices } from './init'

initServices()

const config = getMcpConfig()

const handleMcp = mcpHandler(
  { verifyOptions: { issuer: config.authServerUrl, audience: config.host } },
  async (req, jwt) => {
    const user = await getAuthenticatedUser({ userId: jwt.sub! })
    const org = user?.organizations?.[0]

    if (!org) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ctx = { orgId: org.id, connectionKey: org.id }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    const mcpServer = createServer(ctx)
    await mcpServer.connect(transport)

    return transport.handleRequest(req)
  },
)

export const app = new Elysia()
  .use(cors({ credentials: true, origin: config.allowedOrigins }))

  .get('/.well-known/oauth-protected-resource', () => ({
    resource: config.host,
    authorization_servers: [config.authServerUrl],
  }))

  .all('/mcp', ({ request }) => handleMcp(request))
