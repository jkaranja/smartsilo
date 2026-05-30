import type { KyselyContext } from '@saas/db'
import type { ListParts, GetPartBySku, ListLowStockParts, AdjustPartStock, UpsertPart } from '../../lib'

export const list         = async (db: KyselyContext, input: ListParts) => []

export const getBySku     = async (db: KyselyContext, input: GetPartBySku) => null

export const listLowStock = async (db: KyselyContext, input: ListLowStockParts) => []

export const adjustStock  = async (db: KyselyContext, input: AdjustPartStock) => null

export const upsert       = async (db: KyselyContext, input: UpsertPart) => null

export default { list, getBySku, listLowStock, adjustStock, upsert }
