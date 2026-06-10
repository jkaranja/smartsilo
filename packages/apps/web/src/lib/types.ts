export interface Capability {
  id:    string
  label: string
  icon:  string
}

export interface App {
  name: string
}

export type StreamEvent =
  | { type: 'connected';         capabilities: Capability[]; apps: App[] }
  | { type: 'text_delta';        text: string }
  | { type: 'tool_call';         tool: string; input: unknown }
  | { type: 'tool_result';       tool: string; result: unknown }
  | { type: 'approval_required'; approvalId: string; tool: string; input: unknown; description: string }
  | { type: 'approval_granted';  approvalId: string }
  | { type: 'done' }
  | { type: 'error';             message: string }

export interface UIMessage {
  id:        string
  role:      'user' | 'agent'
  content:   string
  thinking?: boolean
  toolName?: string
  isError?:  boolean
}

export interface ApprovalEvent {
  approvalId:  string
  tool:        string
  input:       unknown
  description: string
}
