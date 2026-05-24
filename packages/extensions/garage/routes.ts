import { Elysia, t } from 'elysia'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import { withTenant } from '@saas/db'
import { GarageService } from './service'

export const garageRoutes = new Elysia({ prefix: '/garage' })
  .use(gatewayMiddleware)

  .get('/parts', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'inventory:read')
    return withTenant(tenantId, connectionKey, (db: any) =>
      db.selectFrom('garage_parts_inventory').selectAll().execute(),
    )
  })

  .get('/parts/low-stock', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'inventory:read')
    return new GarageService(tenantId, connectionKey).listLowStockParts()
  })

  .get('/parts/:sku', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'inventory:read')
    const result = await new GarageService(tenantId, connectionKey).checkPartStock(params.sku)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/parts/:sku/adjust',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'inventory:write')
      const result = await new GarageService(tenantId, connectionKey).adjustPartStock(params.sku, body.delta, body.reason)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { body: t.Object({ delta: t.Number(), reason: t.Optional(t.String()) }) },
  )

  .post(
    '/purchase-orders',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'inventory:write')
      return new GarageService(tenantId, connectionKey).createPurchaseOrder(body.sku, body.quantity, body.urgency)
    },
    { body: t.Object({ sku: t.String(), quantity: t.Number(), urgency: t.Optional(t.String()) }) },
  )

  .get(
    '/work-orders',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'work_orders:read')
      return new GarageService(tenantId, connectionKey).listWorkOrders(query.status, query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ status: t.Optional(t.String()), limit: t.Optional(t.String()) }) },
  )

  .get('/work-orders/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'work_orders:read')
    const result = await new GarageService(tenantId, connectionKey).getWorkOrder(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/work-orders',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'work_orders:write')
      return new GarageService(tenantId, connectionKey).createWorkOrder(body.vehicle_id, body.description, body.assigned_to)
    },
    {
      body: t.Object({
        vehicle_id:  t.String(),
        description: t.Optional(t.String()),
        assigned_to: t.Optional(t.String()),
      }),
    },
  )

  .patch(
    '/work-orders/:id',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'work_orders:write')
      const result = await new GarageService(tenantId, connectionKey).updateWorkOrder(params.id, body)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    {
      body: t.Object({
        status:       t.Optional(t.String()),
        description:  t.Optional(t.String()),
        assigned_to:  t.Optional(t.String()),
        labour_hours: t.Optional(t.Number()),
      }),
    },
  )

  .post(
    '/work-orders/:id/close',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'work_orders:close')
      const result = await new GarageService(tenantId, connectionKey).closeWorkOrder(params.id, body.total_cost, body.labour_hours)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { body: t.Object({ total_cost: t.Optional(t.Number()), labour_hours: t.Optional(t.Number()) }) },
  )

  .get(
    '/customers',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'users:read')
      return new GarageService(tenantId, connectionKey).listCustomers(query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ limit: t.Optional(t.String()) }) },
  )

  .get(
    '/vehicles',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'inventory:read')
      return new GarageService(tenantId, connectionKey).listVehicles(query.customer_id)
    },
    { query: t.Object({ customer_id: t.Optional(t.String()) }) },
  )
