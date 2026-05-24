import Anthropic from '@anthropic-ai/sdk'
import { createMcpServer } from '@saas/mcp/server-host'
import { getExternalMcpServers } from './external-mcp'
import { buildSystemPrompt } from './prompt'
import type { AgentContext, StreamEvent, Message, Capability } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function* runAgentLoop(
  ctx:         AgentContext,
  userMessage: string,
  history:     Message[],
): AsyncGenerator<StreamEvent> {
  const systemPrompt = buildSystemPrompt(ctx)

  const internalServer = await createMcpServer(
    ctx.tenantId,
    ctx.connectionKey,
    ctx.industry,
    ctx.plan,
    ctx.role,
    ctx.permissions,
  )

  const externalServers = await getExternalMcpServers(ctx.tenantId, ctx.connectionKey)

  const allTools: Anthropic.Tool[] = [
    ...(await internalServer.listTools()),
    ...externalServers.flatMap(s => s.listTools()),
  ]

  const messages: Anthropic.MessageParam[] = [
    ...(history as Anthropic.MessageParam[]),
    { role: 'user', content: userMessage },
  ]

  while (true) {
    const stream = anthropic.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      tools:      allTools.length > 0 ? allTools : undefined,
      messages,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text_delta', text: event.delta.text }
      }
    }

    const response = await stream.finalMessage()

    if (response.stop_reason === 'end_turn') {
      yield { type: 'done', availableTools: buildCapabilities(allTools, ctx) }
      break
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      const toolMeta = allTools.find(t => t.name === block.name)

      yield { type: 'tool_call', tool: block.name, input: block.input }

      if (requiresApproval(toolMeta, ctx)) {
        const approvalId = crypto.randomUUID()

        yield {
          type:        'approval_required',
          approvalId,
          tool:        block.name,
          input:       block.input,
          description: describeAction(block.name, block.input),
        }

        const approved = await ctx.approvalChannel.waitFor(approvalId)

        if (!approved) {
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     'Action cancelled by user',
          })
          continue
        }

        yield { type: 'approval_granted', approvalId }
      }

      try {
        const server = getServerForTool(block.name, internalServer, externalServers)
        const result = await server.callTool(block.name, block.input as Record<string, unknown>)

        yield { type: 'tool_result', tool: block.name, result }

        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     JSON.stringify(result),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     `Error: ${message}`,
          is_error:    true,
        })
      }
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user',      content: toolResults })
  }
}

function requiresApproval(tool: Anthropic.Tool | undefined, ctx: AgentContext): boolean {
  if (!tool) return false
  const approval = (tool as any)._approval as string | undefined
  if (approval === 'human') return true
  if (approval === 'human_or_policy') return !policyAllows(ctx, tool.name)
  return false
}

function policyAllows(_ctx: AgentContext, _toolName: string): boolean {
  return false
}

function getServerForTool(
  name:     string,
  internal: { callTool: (name: string, input: Record<string, unknown>) => Promise<unknown> },
  external: Array<{ hasToolNamed: (name: string) => boolean; callTool: (name: string, input: Record<string, unknown>) => Promise<unknown> }>,
) {
  for (const s of external) {
    if (s.hasToolNamed(name)) return s
  }
  return internal
}

function describeAction(toolName: string, input: unknown): string {
  const descriptions: Record<string, (i: any) => string> = {
    create_reorder:      (i) => `Reorder ${i.quantity}x ${i.sku} (${i.urgency} delivery)`,
    complete_work_order: (i) => `Mark work order ${i.work_order_id} as complete`,
    dispense_medication: (i) => `Dispense medication for prescription ${i.prescription_id}`,
    send_email:          (i) => `Send email to ${i.to}: "${i.subject}"`,
    send_whatsapp:       (i) => `Send WhatsApp to ${i.to}`,
  }
  const fn = descriptions[toolName]
  return fn ? fn(input) : `Run: ${toolName}`
}

function buildCapabilities(tools: Anthropic.Tool[], ctx: AgentContext): Capability[] {
  return tools.map(t => ({
    name:          t.name,
    description:   t.description ?? '',
    prompt:        suggestedPrompt(t.name, ctx),
    source:        (t as any)._source ?? 'platform',
    connected:     true,
    needsApproval: ['human', 'human_or_policy'].includes((t as any)._approval ?? ''),
    plan:          (t as any)._plan ?? 'starter',
  }))
}

function suggestedPrompt(toolName: string, _ctx: AgentContext): string {
  const prompts: Record<string, string> = {
    get_work_orders:         'Show me all open work orders',
    check_part_stock:        'Check if we have enough brake pads in stock',
    get_patient_summary:     'Summarise today\'s scheduled patients',
    check_medication_stock:  'Which medications are running low?',
    list_vehicle_listings:   'Show me available vehicles under 50,000',
  }
  return prompts[toolName] ?? `Use ${toolName}`
}
