import { z } from 'zod'

export const ListCustomersSchema = z.object({ limit: z.number().optional(), search: z.string().optional() }).describe('List customers')

export type ListCustomers = z.infer<typeof ListCustomersSchema>

export const GetCustomerSchema = z.object({ id: z.string() }).describe('Get a customer by ID')

export type GetCustomer = z.infer<typeof GetCustomerSchema>

export const CreateCustomerSchema = z.object({ name: z.string(), email: z.string().optional(), phone: z.string().optional() }).describe('Create a customer')

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>

export const UpdateCustomerSchema = z.object({ id: z.string(), name: z.string().optional(), email: z.string().optional(), phone: z.string().optional() }).describe('Update a customer')

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>

export default {
  ListSchema:   ListCustomersSchema,
  GetSchema:    GetCustomerSchema,
  CreateSchema: CreateCustomerSchema,
  UpdateSchema: UpdateCustomerSchema,
}
