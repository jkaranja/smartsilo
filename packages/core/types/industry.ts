export type ApprovalLevel = 'none' | 'human' | 'human_or_policy'
export type PlanLevel = 'starter' | 'pro' | 'enterprise'

export interface ToolManifestEntry {
  name: string
  description: string
  permission: string
  approval: ApprovalLevel
  plan: PlanLevel
  inputSchema: Record<string, {
    type: string
    required?: boolean
    description?: string
  }>
}
