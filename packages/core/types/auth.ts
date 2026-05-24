import type { Industry, Plan } from './tenant'

export type GarageRole = 'owner' | 'manager' | 'mechanic' | 'service_advisor'
export type ClinicRole = 'owner' | 'admin' | 'physician' | 'nurse' | 'receptionist'
export type DealerRole = 'owner' | 'manager' | 'sales' | 'finance'
export type Role = GarageRole | ClinicRole | DealerRole

export interface RequestContext {
  tenantId: string
  tenantSlug: string
  industry: Industry
  plan: Plan
  connectionKey: string
  userId: string
  role: Role
}
