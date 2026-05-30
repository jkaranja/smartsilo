export interface OperationAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  requiresPolicy?: boolean
}

export interface OperationContext {
  orgId: string
  connectionKey: string
}

export interface OperationDef<TSchema = Record<string, unknown>, TInput = unknown> {
  name: string
  description: string
  permission?: string
  plan?: 'starter' | 'pro' | 'enterprise'
  annotations?: OperationAnnotations
  inputSchema: TSchema
  handler(input: TInput, ctx: OperationContext): Promise<unknown>
}
