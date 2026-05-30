import type { ToolManifest } from '@saas/garage'
export type { ToolManifest }

export const dealershipManifest: ToolManifest[] = [
  {
    name: 'list_listings',
    description: 'List vehicle listings',
    permission: 'listings:read',
    plan: 'starter',
    annotations: { readOnlyHint: true },
    inputSchema: {
      status: { type: 'string', enum: ['available', 'sold', 'pending'] },
      limit:  { type: 'number' },
    },
  },
  {
    name: 'get_listing',
    description: 'Get a vehicle listing',
    permission: 'listings:read',
    plan: 'starter',
    annotations: { readOnlyHint: true },
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_listing',
    description: 'Add a vehicle listing',
    permission: 'listings:write',
    plan: 'starter',
    annotations: {},
    inputSchema: {
      vin:          { type: 'string', required: true },
      make:         { type: 'string', required: true },
      model:        { type: 'string', required: true },
      year:         { type: 'number', required: true },
      mileage:      { type: 'number' },
      asking_price: { type: 'number' },
    },
  },
  {
    name: 'update_listing_status',
    description: "Update a listing's status",
    permission: 'listings:write',
    plan: 'starter',
    annotations: { destructiveHint: true, requiresPolicy: true },
    inputSchema: {
      id:     { type: 'string', required: true },
      status: { type: 'string', required: true, enum: ['available', 'sold', 'pending'] },
    },
  },
  {
    name: 'list_deals',
    description: 'List sales deals',
    permission: 'deals:read',
    plan: 'starter',
    annotations: { readOnlyHint: true },
    inputSchema: {
      limit:          { type: 'number' },
      include_closed: { type: 'boolean' },
    },
  },
  {
    name: 'get_deal',
    description: 'Get a deal',
    permission: 'deals:read',
    plan: 'starter',
    annotations: { readOnlyHint: true },
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_deal',
    description: 'Create a sales deal',
    permission: 'deals:write',
    plan: 'starter',
    annotations: { destructiveHint: true },
    inputSchema: {
      listing_id:     { type: 'string', required: true },
      buyer_name:     { type: 'string', required: true },
      sale_price:     { type: 'number' },
      financing_type: { type: 'string', enum: ['cash', 'finance', 'lease'] },
    },
  },
  {
    name: 'close_deal',
    description: 'Close a deal',
    permission: 'deals:write',
    plan: 'starter',
    annotations: { destructiveHint: true },
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'list_trade_ins',
    description: 'List trade-in appraisals',
    permission: 'trade_ins:read',
    plan: 'starter',
    annotations: { readOnlyHint: true },
    inputSchema: {
      limit: { type: 'number' },
    },
  },
  {
    name: 'create_trade_in',
    description: 'Record a trade-in appraisal',
    permission: 'trade_ins:write',
    plan: 'starter',
    annotations: {},
    inputSchema: {
      vin:           { type: 'string', required: true },
      make:          { type: 'string', required: true },
      model:         { type: 'string', required: true },
      year:          { type: 'number', required: true },
      offered_value: { type: 'number' },
      listing_id:    { type: 'string', description: 'Vehicle being traded against' },
    },
  },
]
