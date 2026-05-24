export interface ToolManifest {
  name: string
  description: string
  permission: string
  approval: 'none' | 'human' | 'human_or_policy'
  plan: 'starter' | 'pro' | 'enterprise'
  inputSchema: Record<string, { type: string; description?: string; required?: boolean; enum?: string[] }>
}

export const clinicManifest: ToolManifest[] = [
  {
    name: 'list_patients',
    description: 'List patients',
    permission: 'patients:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      limit: { type: 'number' },
    },
  },
  {
    name: 'get_patient',
    description: 'Get patient details',
    permission: 'patients:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'create_patient',
    description: 'Register new patient',
    permission: 'patients:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      full_name: { type: 'string', required: true },
      date_of_birth: { type: 'string' },
      allergies: { type: 'string', description: 'comma-separated list' },
    },
  },
  {
    name: 'list_appointments',
    description: 'List appointments',
    permission: 'appointments:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      physician_id: { type: 'string' },
      status: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
      date: { type: 'string', description: 'ISO date string to filter by day' },
    },
  },
  {
    name: 'get_appointment',
    description: 'Get appointment details',
    permission: 'appointments:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
    },
  },
  {
    name: 'schedule_appointment',
    description: 'Schedule a new appointment',
    permission: 'appointments:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      patient_id: { type: 'string', required: true },
      physician_id: { type: 'string' },
      scheduled_at: { type: 'string', required: true, description: 'ISO datetime' },
      chief_complaint: { type: 'string' },
    },
  },
  {
    name: 'update_appointment',
    description: 'Update appointment status or details',
    permission: 'appointments:write',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
      status: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
      notes: { type: 'string' },
      physician_id: { type: 'string' },
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an appointment',
    permission: 'appointments:write',
    approval: 'human_or_policy',
    plan: 'starter',
    inputSchema: {
      id: { type: 'string', required: true },
      reason: { type: 'string' },
    },
  },
  {
    name: 'list_medications',
    description: 'List medication inventory',
    permission: 'inventory:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      include_expired: { type: 'boolean' },
    },
  },
  {
    name: 'check_medication_stock',
    description: 'Check stock for a medication SKU',
    permission: 'inventory:read',
    approval: 'none',
    plan: 'starter',
    inputSchema: {
      sku: { type: 'string', required: true },
    },
  },
  {
    name: 'adjust_medication_stock',
    description: 'Adjust medication quantity',
    permission: 'inventory:write',
    approval: 'human',
    plan: 'starter',
    inputSchema: {
      sku: { type: 'string', required: true },
      lot_number: { type: 'string' },
      delta: { type: 'number', required: true },
      reason: { type: 'string' },
    },
  },
]
