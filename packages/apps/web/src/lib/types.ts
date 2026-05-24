export type StreamEvent =
  | { type: 'text_delta';        text: string }
  | { type: 'tool_call';         tool: string; input: unknown }
  | { type: 'tool_result';       tool: string; result: unknown }
  | { type: 'approval_required'; approvalId: string; tool: string; input: unknown; description: string }
  | { type: 'approval_granted';  approvalId: string }
  | { type: 'done';              availableTools?: Capability[] }
  | { type: 'error';             message: string }

export interface UIMessage {
  id:        string
  role:      'user' | 'agent'
  content:   string
  thinking?: boolean
  toolName?: string
  isError?:  boolean
}

export interface Capability {
  name:          string
  description:   string
  prompt:        string
  source:        string
  connected:     boolean
  needsApproval: boolean
  plan:          string
}

export interface ApprovalEvent {
  approvalId:  string
  tool:        string
  input:       unknown
  description: string
}
