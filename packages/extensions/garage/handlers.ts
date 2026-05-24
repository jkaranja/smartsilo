import type { GarageService } from './service'

type McpResult = { content: Array<{ type: 'text'; text: string }> }

function ok(result: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}

export const garageHandlers = {
  check_part_stock: async (service: GarageService, input: { sku: string }): Promise<McpResult> => {
    const result = await service.checkPartStock(input.sku)
    return ok(result)
  },

  list_low_stock_parts: async (service: GarageService, _input: Record<string, never>): Promise<McpResult> => {
    const result = await service.listLowStockParts()
    return ok(result)
  },

  adjust_part_stock: async (
    service: GarageService,
    input: { sku: string; delta: number; reason?: string },
  ): Promise<McpResult> => {
    const result = await service.adjustPartStock(input.sku, input.delta, input.reason)
    return ok(result)
  },

  create_purchase_order: async (
    service: GarageService,
    input: { sku: string; quantity: number; urgency?: string },
  ): Promise<McpResult> => {
    const result = await service.createPurchaseOrder(input.sku, input.quantity, input.urgency)
    return ok(result)
  },

  list_work_orders: async (
    service: GarageService,
    input: { status?: string; limit?: number },
  ): Promise<McpResult> => {
    const result = await service.listWorkOrders(input.status, input.limit)
    return ok(result)
  },

  get_work_order: async (service: GarageService, input: { id: string }): Promise<McpResult> => {
    const result = await service.getWorkOrder(input.id)
    return ok(result)
  },

  create_work_order: async (
    service: GarageService,
    input: { vehicle_id: string; description?: string; assigned_to?: string },
  ): Promise<McpResult> => {
    const result = await service.createWorkOrder(input.vehicle_id, input.description, input.assigned_to)
    return ok(result)
  },

  update_work_order: async (
    service: GarageService,
    input: { id: string; status?: string; description?: string; assigned_to?: string; labour_hours?: number },
  ): Promise<McpResult> => {
    const { id, ...updates } = input
    const result = await service.updateWorkOrder(id, updates)
    return ok(result)
  },

  close_work_order: async (
    service: GarageService,
    input: { id: string; total_cost?: number; labour_hours?: number },
  ): Promise<McpResult> => {
    const result = await service.closeWorkOrder(input.id, input.total_cost, input.labour_hours)
    return ok(result)
  },

  list_customers: async (service: GarageService, input: { limit?: number }): Promise<McpResult> => {
    const result = await service.listCustomers(input.limit)
    return ok(result)
  },

  list_vehicles: async (service: GarageService, input: { customer_id?: string }): Promise<McpResult> => {
    const result = await service.listVehicles(input.customer_id)
    return ok(result)
  },
}
