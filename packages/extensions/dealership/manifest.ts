export interface ToolManifest {
  name: string
  description: string
  permission: string
  approval: 'none' | 'human' | 'human_or_policy'
  plan: 'starter' | 'pro' | 'enterprise'
  inputSchema: Record<string, { type: string; description?: string; required?: boolean; enum?: string[] }>
}

export const dealershipManifest: ToolManifest[] = [
  {
    name: 'list_listings',
    description: 'List vehicle listings',
    permission: 'listings:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      status: { type: 'string', enum: ['available', 'sold', 'pending'] },
      limit: { type: 'number' },
    },
  },
  {
    name: 'get_listing',
    description: 'Get a vehicle listing',
    permission: 'listings:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_listing',
    description: 'Add a vehicle listing',
    permission: 'listings:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      vin: { type: 'string', required: true },
      make: { type: 'string', required: true },
      model: { type: 'string', required: true },
      year: { type: 'number', required: true },
      mileage: { type: 'number' },
      asking_price: { type: 'number' },
    },
  },
  {
    name: 'update_listing_status',
    description: "Update a listing's status",
    permission: 'listings:write',
    approval: 'human_or_policy',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
      status: { type: 'string', required: true, enum: ['available', 'sold', 'pending'] },
    },
  },
  {
    name: 'list_deals',
    description: 'List sales deals',
    permission: 'deals:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      limit: { type: 'number' },
      include_closed: { type: 'boolean' },
    },
  },
  {
    name: 'get_deal',
    description: 'Get a deal',
    permission: 'deals:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_deal',
    description: 'Create a sales deal',
    permission: 'deals:write',
    approval: 'human',
    plan: 'starter',
    inputSchema: {
      listing_id: { type: 'string', required: true },
      buyer_name: { type: 'string', required: true },
      sale_price: { type: 'number' },
      financing_type: { type: 'string', enum: ['cash', 'finance', 'lease'] },
    },
  },
  {
    name: 'close_deal',
    description: 'Close a deal',
    permission: 'deals:write',
    approval: 'human',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'list_trade_ins',
    description: 'List trade-in appraisals',
    permission: 'trade_ins:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      limit: { type: 'number' },
    },
  },
  {
    name: 'create_trade_in',
    description: 'Record a trade-in appraisal',
    permission: 'trade_ins:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      vin: { type: 'string', required: true },
      make: { type: 'string', required: true },
      model: { type: 'string', required: true },
      year: { type: 'number', required: true },
      offered_value: { type: 'number' },
      listing_id: { type: 'string', description: 'Vehicle being traded against' },
    },
  },
]
