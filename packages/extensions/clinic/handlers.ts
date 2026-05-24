import type { ClinicService } from './service'

type McpResult = { content: Array<{ type: 'text'; text: string }> }

function ok(result: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}

export const clinicHandlers = {
  list_patients: async (service: ClinicService, input: { limit?: number }): Promise<McpResult> => {
    const result = await service.listPatients(input.limit)
    return ok(result)
  },

  get_patient: async (service: ClinicService, input: { id: string }): Promise<McpResult> => {
    const result = await service.getPatient(input.id)
    return ok(result)
  },

  create_patient: async (
    service: ClinicService,
    input: { full_name: string; date_of_birth?: string; allergies?: string },
  ): Promise<McpResult> => {
    const result = await service.createPatient(input.full_name, input.date_of_birth, input.allergies)
    return ok(result)
  },

  list_appointments: async (
    service: ClinicService,
    input: { physician_id?: string; status?: string; date?: string },
  ): Promise<McpResult> => {
    const result = await service.listAppointments(input.physician_id, input.status, input.date)
    return ok(result)
  },

  get_appointment: async (service: ClinicService, input: { id: string }): Promise<McpResult> => {
    const result = await service.getAppointment(input.id)
    return ok(result)
  },

  schedule_appointment: async (
    service: ClinicService,
    input: { patient_id: string; physician_id?: string; scheduled_at: string; chief_complaint?: string },
  ): Promise<McpResult> => {
    const result = await service.scheduleAppointment(
      input.patient_id,
      input.scheduled_at,
      input.physician_id,
      input.chief_complaint,
    )
    return ok(result)
  },

  update_appointment: async (
    service: ClinicService,
    input: { id: string; status?: string; notes?: string; physician_id?: string },
  ): Promise<McpResult> => {
    const { id, ...updates } = input
    const result = await service.updateAppointment(id, updates)
    return ok(result)
  },

  cancel_appointment: async (
    service: ClinicService,
    input: { id: string; reason?: string },
  ): Promise<McpResult> => {
    const result = await service.cancelAppointment(input.id, input.reason)
    return ok(result)
  },

  list_medications: async (
    service: ClinicService,
    input: { include_expired?: boolean },
  ): Promise<McpResult> => {
    const result = await service.listMedications(input.include_expired)
    return ok(result)
  },

  check_medication_stock: async (service: ClinicService, input: { sku: string }): Promise<McpResult> => {
    const result = await service.checkMedicationStock(input.sku)
    return ok(result)
  },

  adjust_medication_stock: async (
    service: ClinicService,
    input: { sku: string; lot_number?: string; delta: number; reason?: string },
  ): Promise<McpResult> => {
    const result = await service.adjustMedicationStock(
      input.sku,
      input.delta,
      input.reason,
      input.lot_number,
    )
    return ok(result)
  },
}
