import type { ToolManifest } from '@saas/garage'

export type { ToolManifest }

const PLAN_ORDER = ['starter', 'pro', 'enterprise'] as const
type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE'

export function filterByPlan(tools: ToolManifest[], plan: Plan): ToolManifest[] {
  const planIndex = PLAN_ORDER.indexOf(plan.toLowerCase() as any)
  return tools.filter((t) => PLAN_ORDER.indexOf(t.plan) <= planIndex)
}

export function filterByPermissions(tools: ToolManifest[], permissions: string[]): ToolManifest[] {
  return tools.filter((t) => permissions.includes(t.permission))
}

export function getEligibleTools(
  tools: ToolManifest[],
  plan: Plan,
  permissions: string[],
): ToolManifest[] {
  return filterByPermissions(filterByPlan(tools, plan), permissions)
}
