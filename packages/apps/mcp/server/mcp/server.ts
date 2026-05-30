import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { OperationContext } from '@saas/types'
import { registerGarageTools } from '../tools/garage'

export let mcpServer: McpServer

export const createServer = (ctx: OperationContext) => {
  mcpServer = new McpServer({
    name: 'smartsilo-mcp',
    version: '1.0.0',
  })

  registerGarageTools(mcpServer, ctx)

  return mcpServer
}
