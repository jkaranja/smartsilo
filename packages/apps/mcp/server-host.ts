import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type Anthropic from '@anthropic-ai/sdk'
import { garageManifest, GarageService, garageHandlers } from '@saas/garage'
import { clinicManifest, ClinicService, clinicHandlers } from '@saas/clinic'
import { dealershipManifest, DealershipService, dealershipHandlers } from '@saas/dealership'
import { getEligibleTools } from './tool-registry'
import type { ToolManifest } from './tool-registry'

function schemaToZod(inputSchema: ToolManifest['inputSchema']): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const [key, field] of Object.entries(inputSchema)) {
    let zodType: z.ZodTypeAny
    if (field.type === 'string' && field.enum) {
      zodType = z.enum(field.enum as [string, ...string[]])
    } else if (field.type === 'string') {
      zodType = z.string()
    } else if (field.type === 'number') {
      zodType = z.number()
    } else if (field.type === 'boolean') {
      zodType = z.boolean()
    } else {
      zodType = z.string()
    }
    if (!field.required) zodType = zodType.optional()
    shape[key] = zodType
  }
  return shape
}

function schemaToJsonSchema(inputSchema: ToolManifest['inputSchema']) {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [key, field] of Object.entries(inputSchema)) {
    const prop: Record<string, unknown> = { type: field.type }
    if (field.description) prop.description = field.description
    if (field.enum) prop.enum = field.enum
    properties[key] = prop
    if (field.required) required.push(key)
  }
  return { type: 'object' as const, properties, ...(required.length ? { required } : {}) }
}

function resolveIndustry(industry: string) {
  if (industry === 'GARAGE') return {
    manifest: garageManifest,
    handlers: garageHandlers as Record<string, Function>,
    makeService: (tid: string, ck: string) => new GarageService(tid, ck),
  }
  if (industry === 'CLINIC') return {
    manifest: clinicManifest,
    handlers: clinicHandlers as Record<string, Function>,
    makeService: (tid: string, ck: string) => new ClinicService(tid, ck),
  }
  return {
    manifest: dealershipManifest,
    handlers: dealershipHandlers as Record<string, Function>,
    makeService: (tid: string, ck: string) => new DealershipService(tid, ck),
  }
}

// Transport-based MCP server for the HTTP endpoint (port 3001)
export async function createMcpServer(
  tenantId: string,
  connectionKey: string,
  industry: string,
  plan: string,
  _role: string,
  permissions: string[],
): Promise<McpServer> {
  const { manifest, handlers, makeService } = resolveIndustry(industry)
  const eligible = getEligibleTools(manifest, plan.toUpperCase() as any, permissions)
  const service = makeService(tenantId, connectionKey)

  const server = new McpServer({
    name: `saas-${industry.toLowerCase()}-copilot`,
    version: '1.0.0',
  })

  for (const tool of eligible) {
    const zodShape = schemaToZod(tool.inputSchema)
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: zodShape as any },
      async (input: Record<string, unknown>) => handlers[tool.name](service, input),
    )
  }

  return server
}

export interface AgentServer {
  listTools(): Anthropic.Tool[]
  callTool(name: string, input: Record<string, unknown>): Promise<unknown>
}

// Direct-call interface for the in-process agent runtime (no transport needed)
export async function createAgentServer(
  tenantId: string,
  connectionKey: string,
  industry: string,
  plan: string,
  _role: string,
  permissions: string[],
): Promise<AgentServer> {
  const { manifest, handlers, makeService } = resolveIndustry(industry)
  const eligible = getEligibleTools(manifest, plan.toUpperCase() as any, permissions)
  const service = makeService(tenantId, connectionKey)

  const anthropicTools: Anthropic.Tool[] = eligible.map((tool) => {
    const t = {
      name:         tool.name,
      description:  tool.description,
      input_schema: schemaToJsonSchema(tool.inputSchema),
    } as Anthropic.Tool
    ;(t as any)._approval = tool.approval
    ;(t as any)._plan     = tool.plan
    ;(t as any)._source   = 'platform'
    return t
  })

  return {
    listTools: () => anthropicTools,
    callTool: async (name, input) => {
      const handler = handlers[name]
      if (!handler) throw new Error(`Unknown tool: ${name}`)
      return handler(service, input)
    },
  }
}
