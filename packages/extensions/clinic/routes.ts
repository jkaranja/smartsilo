import { Elysia, t } from 'elysia'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import { ClinicService } from './service'

export const clinicRoutes = new Elysia({ prefix: '/clinic' })
  .use(gatewayMiddleware)

  .get(
    '/patients',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'patients:read')
      return new ClinicService(tenantId, connectionKey).listPatients(query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ limit: t.Optional(t.String()) }) },
  )

  .get('/patients/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'patients:read')
    const result = await new ClinicService(tenantId, connectionKey).getPatient(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/patients',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'patients:write')
      return new ClinicService(tenantId, connectionKey).createPatient(body.full_name, body.date_of_birth, body.allergies)
    },
    {
      body: t.Object({
        full_name:     t.String(),
        date_of_birth: t.Optional(t.String()),
        allergies:     t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/appointments',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'appointments:read')
      return new ClinicService(tenantId, connectionKey).listAppointments(query.physician_id, query.status, query.date)
    },
    {
      query: t.Object({
        physician_id: t.Optional(t.String()),
        status:       t.Optional(t.String()),
        date:         t.Optional(t.String()),
      }),
    },
  )

  .get('/appointments/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'appointments:read')
    const result = await new ClinicService(tenantId, connectionKey).getAppointment(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/appointments',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'appointments:write')
      return new ClinicService(tenantId, connectionKey).scheduleAppointment(
        body.patient_id,
        body.scheduled_at,
        body.physician_id,
        body.chief_complaint,
      )
    },
    {
      body: t.Object({
        patient_id:      t.String(),
        physician_id:    t.Optional(t.String()),
        scheduled_at:    t.String(),
        chief_complaint: t.Optional(t.String()),
      }),
    },
  )

  .patch(
    '/appointments/:id',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'appointments:write')
      const result = await new ClinicService(tenantId, connectionKey).updateAppointment(params.id, body)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    {
      body: t.Object({
        status:       t.Optional(t.String()),
        notes:        t.Optional(t.String()),
        physician_id: t.Optional(t.String()),
      }),
    },
  )

  .delete(
    '/appointments/:id',
    async ({ tenantId, connectionKey, role, params, query }) => {
      requirePermission(role, 'appointments:write')
      const result = await new ClinicService(tenantId, connectionKey).cancelAppointment(params.id, query.reason)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { query: t.Object({ reason: t.Optional(t.String()) }) },
  )

  .get(
    '/medications',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'inventory:read')
      return new ClinicService(tenantId, connectionKey).listMedications(query.include_expired === 'true')
    },
    { query: t.Object({ include_expired: t.Optional(t.String()) }) },
  )

  .get('/medications/:sku', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'inventory:read')
    const result = await new ClinicService(tenantId, connectionKey).checkMedicationStock(params.sku)
    if (!result || (Array.isArray(result) && result.length === 0)) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/medications/:sku/adjust',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'inventory:write')
      return new ClinicService(tenantId, connectionKey).adjustMedicationStock(params.sku, body.delta, body.reason, body.lot_number)
    },
    {
      body: t.Object({
        delta:      t.Number(),
        lot_number: t.Optional(t.String()),
        reason:     t.Optional(t.String()),
      }),
    },
  )
