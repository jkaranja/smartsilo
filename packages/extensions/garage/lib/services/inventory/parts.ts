import { z } from 'zod'

export const ListPartsSchema = z.object({ limit: z.number().optional() }).describe('List all parts in inventory')

export type ListParts = z.infer<typeof ListPartsSchema>

export const GetPartBySkuSchema = z.object({ sku: z.string() }).describe('Get a part by SKU')

export type GetPartBySku = z.infer<typeof GetPartBySkuSchema>

export const ListLowStockPartsSchema = z.object({ threshold: z.number().optional() }).describe('List parts at or below reorder point')

export type ListLowStockParts = z.infer<typeof ListLowStockPartsSchema>

export const AdjustPartStockSchema = z.object({ sku: z.string(), delta: z.number(), reason: z.string().optional() }).describe('Adjust stock quantity for a SKU')

export type AdjustPartStock = z.infer<typeof AdjustPartStockSchema>

export const UpsertPartSchema = z.object({ sku: z.string(), name: z.string(), quantity: z.number(), reorder_point: z.number(), unit_cost: z.number().optional() }).describe('Create or update a part')

export type UpsertPart = z.infer<typeof UpsertPartSchema>

export default {
  ListSchema:         ListPartsSchema,
  GetSchema:          GetPartBySkuSchema,
  ListLowStockSchema: ListLowStockPartsSchema,
  AdjustStockSchema:  AdjustPartStockSchema,
  UpsertSchema:       UpsertPartSchema,
}
