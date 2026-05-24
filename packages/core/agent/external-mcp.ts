import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { withTenant } from '@saas/db'

export async function getExternalMcpServers(
  tenantId:      string,
  connectionKey: string,
) {
  const rows = await withTenant(tenantId, connectionKey, async (db) => {
    return db
      .selectFrom('external_mcp_servers')
      .select(['id', 'name', 'server_url', 'auth_token'])
      .where('is_active', '=', true)
      .execute()
  })

  const results = await Promise.allSettled(rows.map(row => connectExternalServer(row)))

  return results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof connectExternalServer>>> => r.status === 'fulfilled')
    .map(r => r.value)
}

async function connectExternalServer(server: {
  id: string; name: string; server_url: string; auth_token: string | null
}) {
  const transport = new StreamableHTTPClientTransport(
    new URL(server.server_url),
    server.auth_token
      ? { requestInit: { headers: { Authorization: `Bearer ${server.auth_token}` } } }
      : undefined,
  )

  const client = new Client(
    { name: `${server.name}-client`, version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  await client.connect(transport)

  const { tools } = await client.listTools()

  return {
    name: server.name,

    hasToolNamed: (name: string) => tools.some(t => t.name === name),

    listTools: () => tools.map(t => ({
      name:        t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema,
      _source:     server.name.toLowerCase(),
      _approval:   'human_or_policy',
    })),

    callTool: async (name: string, input: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: input })
      return result.content
    },
  }
}
