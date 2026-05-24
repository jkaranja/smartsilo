export type Industry = 'GARAGE' | 'CLINIC' | 'DEALERSHIP'
export type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE'
export type DbTier = 'POOL' | 'SILO'

export interface Tenant {
  id: string
  slug: string
  name: string
  industry: Industry
  plan: Plan
  dbTier: DbTier
  connectionKey: string
  status: string
  createdAt: Date
}
