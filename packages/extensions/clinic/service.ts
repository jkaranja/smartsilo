import { withTenant } from '@saas/db'

export class ClinicService {
  constructor(
    private tenantId: string,
    private connectionKey: string,
  ) {}

  async listPatients(limit = 50) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('clinic_patients')
        .selectAll()
        .limit(limit)
        .orderBy('created_at', 'desc')
        .execute()
    })
  }

  async getPatient(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('clinic_patients')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
    })
  }

  async createPatient(fullName: string, dateOfBirth?: string, allergies?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .insertInto('clinic_patients')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          medical_record: `MR-${Date.now()}`,
          full_name: fullName,
          allergies: allergies ? allergies.split(',').map((a) => a.trim()) : [],
          ...(dateOfBirth !== undefined && { date_of_birth: new Date(dateOfBirth) }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async listAppointments(physicianId?: string, status?: string, date?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = db
        .selectFrom('clinic_appointments')
        .selectAll()
        .orderBy('scheduled_at', 'asc')

      if (physicianId) {
        query = query.where('physician_id', '=', physicianId)
      }

      if (status) {
        query = query.where('status', '=', status)
      }

      if (date) {
        const dateStart = new Date(date)
        dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date)
        dateEnd.setHours(23, 59, 59, 999)
        query = query
          .where('scheduled_at', '>=', dateStart)
          .where('scheduled_at', '<', dateEnd)
      }

      return query.execute()
    })
  }

  async getAppointment(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('clinic_appointments')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
    })
  }

  async scheduleAppointment(
    patientId: string,
    scheduledAt: string,
    physicianId?: string,
    chiefComplaint?: string,
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .insertInto('clinic_appointments')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          patient_id: patientId,
          scheduled_at: new Date(scheduledAt),
          status: 'SCHEDULED',
          ...(physicianId !== undefined && { physician_id: physicianId }),
          ...(chiefComplaint !== undefined && { chief_complaint: chiefComplaint }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async updateAppointment(
    id: string,
    updates: { status?: string; notes?: string; physician_id?: string },
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .updateTable('clinic_appointments')
        .set(updates)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  async cancelAppointment(id: string, reason?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      const existing = await db
        .selectFrom('clinic_appointments')
        .select('notes')
        .where('id', '=', id)
        .executeTakeFirst()

      const notes = reason
        ? [existing?.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n')
        : existing?.notes ?? null

      return db
        .updateTable('clinic_appointments')
        .set({ status: 'CANCELLED', notes })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()
    })
  }

  async listMedications(includeExpired = false) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = db.selectFrom('clinic_medications').selectAll()

      if (!includeExpired) {
        query = query.where('expiry_date', '>', new Date())
      }

      return query.orderBy('expiry_date', 'asc').execute()
    })
  }

  async checkMedicationStock(sku: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return db
        .selectFrom('clinic_medications')
        .selectAll()
        .where('sku', '=', sku)
        .execute()
    })
  }

  async adjustMedicationStock(sku: string, delta: number, reason?: string, lotNumber?: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = db
        .updateTable('clinic_medications')
        .set((eb) => ({ quantity: eb('quantity', '+', delta) }))
        .where('sku', '=', sku)

      if (lotNumber) {
        query = query.where('lot_number', '=', lotNumber)
      }

      return query.returningAll().execute()
    })
  }
}
