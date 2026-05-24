export interface ToolManifest {
  name: string
  description: string
  permission: string
  approval: 'none' | 'human' | 'human_or_policy'
  plan: 'starter' | 'pro' | 'enterprise'
  inputSchema: Record<string, { type: string; description?: string; required?: boolean; enum?: string[] }>
}

export const garageManifest: ToolManifest[] = [
  {
    name: 'check_part_stock',
    description: 'Get stock level for a SKU',
    permission: 'inventory:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      sku: { type: 'string', required: true },
    },
  },
  {
    name: 'list_low_stock_parts',
    description: 'List parts at or below reorder point',
    permission: 'inventory:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {},
  },
  {
    name: 'adjust_part_stock',
    description: 'Adjust quantity for a SKU (+/-)',
    permission: 'inventory:write',
    approval: 'human_or_policy',
    plan: 'starter',
    inputSchema: {
      sku: { type: 'string', required: true },
      delta: { type: 'number', required: true },
      reason: { type: 'string' },
    },
  },
  {
    name: 'create_purchase_order',
    description: 'Create a purchase order for a part',
    permission: 'inventory:write',
    approval: 'human_or_policy',
    plan: 'starter',
    inputSchema: {
      sku: { type: 'string', required: true },
      quantity: { type: 'number', required: true },
      urgency: { type: 'string', enum: ['standard', 'urgent'] },
    },
  },
  {
    name: 'list_work_orders',
    description: 'List work orders',
    permission: 'work_orders:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'CLOSED'] },
      limit: { type: 'number' },
    },
  },
  {
    name: 'get_work_order',
    description: 'Get details of a work order',
    permission: 'work_orders:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_work_order',
    description: 'Create a new work order',
    permission: 'work_orders:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      vehicle_id: { type: 'string', required: true },
      description: { type: 'string' },
      assigned_to: { type: 'string' },
    },
  },
  {
    name: 'update_work_order',
    description: 'Update a work order status or details',
    permission: 'work_orders:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
      status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] },
      description: { type: 'string' },
      assigned_to: { type: 'string' },
      labour_hours: { type: 'number' },
    },
  },
  {
    name: 'close_work_order',
    description: 'Close a work order',
    permission: 'work_orders:close',
    approval: 'human',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
      total_cost: { type: 'number' },
      labour_hours: { type: 'number' },
    },
  },
  {
    name: 'list_customers',
    description: 'List garage customers',
    permission: 'users:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      limit: { type: 'number' },
    },
  },
  {
    name: 'list_vehicles',
    description: 'List vehicles, optionally filtered by customer',
    permission: 'inventory:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      customer_id: { type: 'string' },
    },
  },
]
