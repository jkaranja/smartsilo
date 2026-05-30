import { z } from "zod";

const urgency = z.enum(["standard", "urgent"]);

const status = z.enum(["PENDING", "ORDERED", "RECEIVED", "CANCELLED"]);

export const ListOrdersSchema = z
  .object({ status: status.optional(), limit: z.number().optional() })
  .describe("List purchase orders");

export type ListOrders = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z
  .object({ id: z.string() })
  .describe("Get a purchase order by ID");

export type GetOrder = z.infer<typeof GetOrderSchema>;

export const CreateOrderSchema = z
  .object({
    sku: z.string(),
    quantity: z.number(),
    urgency: urgency.optional(),
  })
  .describe("Create a purchase order");

export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z
  .object({ id: z.string(), status })
  .describe("Update purchase order status");

export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

export default {
  ListSchema: ListOrdersSchema,
  GetSchema: GetOrderSchema,
  CreateSchema: CreateOrderSchema,
  UpdateStatusSchema: UpdateOrderStatusSchema,
};
