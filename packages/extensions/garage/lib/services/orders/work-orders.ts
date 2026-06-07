import { z } from "zod";

const status = z.enum(["OPEN", "IN_PROGRESS", "WAITING_PARTS", "CLOSED"]);

export const ListWorkOrdersSchema = z
  .object({ status: status.optional(), limit: z.number().optional() })
  .describe("List work orders");

export type ListWorkOrders = z.infer<typeof ListWorkOrdersSchema>;

export const GetWorkOrderSchema = z
  .object({ id: z.string() })
  .describe("Get a work order by ID");

export type GetWorkOrder = z.infer<typeof GetWorkOrderSchema>;

export const CreateWorkOrderSchema = z
  .object({
    vehicle_id: z.string(),
    description: z.string().optional(),
    assigned_to: z.string().optional(),
  })
  .describe("Create a work order");

export type CreateWorkOrder = z.infer<typeof CreateWorkOrderSchema>;

export const UpdateWorkOrderSchema = z
  .object({
    id: z.string(),
    status: status.exclude(["CLOSED"]).optional(),
    description: z.string().optional(),
    assigned_to: z.string().optional(),
    labour_hours: z.number().optional(),
  })
  .describe("Update a work order");

export type UpdateWorkOrder = z.infer<typeof UpdateWorkOrderSchema>;

export const CloseWorkOrderSchema = z
  .object({
    id: z.string(),
    total_cost: z.number().optional(),
    labour_hours: z.number().optional(),
  })
  .describe("Close a work order");

export type CloseWorkOrder = z.infer<typeof CloseWorkOrderSchema>;

export default {
  ListSchema: ListWorkOrdersSchema,
  GetSchema: GetWorkOrderSchema,
  CreateSchema: CreateWorkOrderSchema,
  UpdateSchema: UpdateWorkOrderSchema,
  CloseSchema: CloseWorkOrderSchema,
};
