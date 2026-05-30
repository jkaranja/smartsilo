import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import type { OperationAnnotations, OperationContext } from '@saas/types'

export interface ToolRegistration {
  name: string
  description: string
  annotations?: OperationAnnotations
  inputSchema: ZodRawShapeCompat
  handler(input: unknown, ctx: OperationContext): Promise<unknown>
}

export function registerTool(server: McpServer, tool: ToolRegistration, ctx: OperationContext) {
  registerAppTool(
    server,
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      _meta: {},
    },
    (input) => tool.handler(input, ctx),
  )
}
