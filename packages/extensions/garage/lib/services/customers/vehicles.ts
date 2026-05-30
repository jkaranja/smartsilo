import { z } from 'zod'

export const ListVehiclesSchema = z.object({ customer_id: z.string().optional(), limit: z.number().optional() }).describe('List vehicles')

export type ListVehicles = z.infer<typeof ListVehiclesSchema>

export const GetVehicleSchema = z.object({ id: z.string() }).describe('Get a vehicle by ID')

export type GetVehicle = z.infer<typeof GetVehicleSchema>

export const CreateVehicleSchema = z.object({ customer_id: z.string(), make: z.string(), model: z.string(), year: z.number(), vin: z.string().optional(), plate: z.string().optional() }).describe('Register a vehicle')

export type CreateVehicle = z.infer<typeof CreateVehicleSchema>

export const UpdateVehicleSchema = z.object({ id: z.string(), make: z.string().optional(), model: z.string().optional(), year: z.number().optional(), plate: z.string().optional() }).describe('Update vehicle details')

export type UpdateVehicle = z.infer<typeof UpdateVehicleSchema>

export default {
  ListSchema:   ListVehiclesSchema,
  GetSchema:    GetVehicleSchema,
  CreateSchema: CreateVehicleSchema,
  UpdateSchema: UpdateVehicleSchema,
}
