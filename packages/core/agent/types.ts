import type { ApprovalChannel } from './approval'

export interface AgentContext {
  tenantId:        string
  tenantName:      string
  tenantSlug:      string
  industry:        string
  plan:            string
  connectionKey:   string
  userId:          string
  userName:        string
  role:            string
  permissions:     string[]
  approvalChannel: ApprovalChannel
}

export type StreamEvent =
  | { type: 'text_delta';        text: string }
  | { type: 'tool_call';         tool: string; input: unknown }
  | { type: 'tool_result';       tool: string; result: unknown }
  | { type: 'approval_required'; approvalId: string; tool: string; input: unknown; description: string }
  | { type: 'approval_granted';  approvalId: string }
  | { type: 'done';              availableTools?: Capability[] }
  | { type: 'error';             message: string }

export interface Capability {
  name:          string
  description:   string
  prompt:        string
  source:        string
  connected:     boolean
  needsApproval: boolean
  plan:          string
}

export interface Message {
  role:    'user' | 'assistant'
  content: string | Record<string, unknown>[]
}
