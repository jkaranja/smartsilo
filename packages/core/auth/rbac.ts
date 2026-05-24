import type { Role } from '@saas/types'

// Permissions granted per role. A role inherits all permissions listed here.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── Universal (applies to the tenant's own industry) ───────────────────────
  // owner and manager hold all permissions; the tool registry filters by
  // industry so a garage owner never sees clinic tools.
  owner: [
    'users:read', 'users:invite', 'users:manage',
    'inventory:read', 'inventory:write',
    'work_orders:read', 'work_orders:write', 'work_orders:close',
    'patients:read', 'patients:write',
    'appointments:read', 'appointments:write',
    'listings:read', 'listings:write',
    'deals:read', 'deals:write',
    'trade_ins:read', 'trade_ins:write',
    'reports:read',
    'integrations:read', 'integrations:manage',
  ],
  manager: [
    'users:read', 'users:invite',
    'inventory:read', 'inventory:write',
    'work_orders:read', 'work_orders:write', 'work_orders:close',
    'patients:read', 'patients:write',
    'appointments:read', 'appointments:write',
    'listings:read', 'listings:write',
    'deals:read', 'deals:write',
    'trade_ins:read', 'trade_ins:write',
    'reports:read',
    'integrations:read', 'integrations:manage',
  ],

  // ── Garage ─────────────────────────────────────────────────────────────────
  mechanic: [
    'work_orders:read', 'work_orders:write',
    'inventory:read',
  ],
  service_advisor: [
    'work_orders:read', 'work_orders:write',
    'inventory:read',
    'users:read',
  ],

  // ── Clinic ─────────────────────────────────────────────────────────────────
  admin: [
    'users:read', 'users:invite', 'users:manage',
    'patients:read', 'patients:write',
    'appointments:read', 'appointments:write',
    'inventory:read', 'inventory:write',
    'reports:read',
    'integrations:read', 'integrations:manage',
  ],
  physician: [
    'patients:read', 'patients:write',
    'appointments:read', 'appointments:write',
    'inventory:read',
  ],
  nurse: [
    'patients:read',
    'appointments:read', 'appointments:write',
    'inventory:read',
  ],
  receptionist: [
    'patients:read',
    'appointments:read', 'appointments:write',
  ],

  // ── Dealership ─────────────────────────────────────────────────────────────
  sales: [
    'listings:read',
    'deals:read', 'deals:write',
    'trade_ins:read', 'trade_ins:write',
  ],
  finance: [
    'listings:read',
    'deals:read', 'deals:write',
    'reports:read',
  ],
}

export function getPermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function requirePermission(role: Role, permission: string): void {
  const allowed = ROLE_PERMISSIONS[role] ?? []
  if (!allowed.includes(permission)) {
    const err = new Error(`Forbidden: ${role} cannot perform ${permission}`) as any
    err.status = 403
    throw err
  }
}
