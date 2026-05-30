import { Elysia, t } from 'elysia'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import * as parts from './services/parts'
import * as workOrders from './services/work-orders'
import * as customers from './services/customers'

const ctx = (tenantId: string, connectionKey: string) => ({ orgId: tenantId, connectionKey })

export const garageRoutes = new Elysia({ prefix: '/garage' })
  .use(gatewayMiddleware)

  .get('/parts', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'inventory:read')
    return parts.listAllParts(ctx(tenantId, connectionKey))
  })

  .get('/parts/low-stock', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'inventory:read')
    return parts.listLowStockParts(ctx(tenantId, connectionKey))
  })

  .get('/parts/:sku', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'inventory:read')
    const result = await parts.checkPartStock(ctx(tenantId, connectionKey), params.sku)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/parts/:sku/adjust',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'inventory:write')
      const result = await parts.adjustPartStock(ctx(tenantId, connectionKey), params.sku, body.delta, body.reason)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { body: t.Object({ delta: t.Number(), reason: t.Optional(t.String()) }) },
  )

  .post(
    '/purchase-orders',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'inventory:write')
      return parts.createPurchaseOrder(ctx(tenantId, connectionKey), body.sku, body.quantity, body.urgency)
    },
    { body: t.Object({ sku: t.String(), quantity: t.Number(), urgency: t.Optional(t.String()) }) },
  )

  .get(
    '/work-orders',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'work_orders:read')
      return workOrders.listWorkOrders(ctx(tenantId, connectionKey), query.status, query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ status: t.Optional(t.String()), limit: t.Optional(t.String()) }) },
  )

  .get('/work-orders/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'work_orders:read')
    const result = await workOrders.getWorkOrder(ctx(tenantId, connectionKey), params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/work-orders',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'work_orders:write')
      return workOrders.createWorkOrder(ctx(tenantId, connectionKey), body.vehicle_id, body.description, body.assigned_to)
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
      const result = await workOrders.updateWorkOrder(ctx(tenantId, connectionKey), params.id, body)
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
      const result = await workOrders.closeWorkOrder(ctx(tenantId, connectionKey), params.id, body.total_cost, body.labour_hours)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { body: t.Object({ total_cost: t.Optional(t.Number()), labour_hours: t.Optional(t.Number()) }) },
  )

  .get(
    '/customers',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'users:read')
      return customers.listCustomers(ctx(tenantId, connectionKey), query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ limit: t.Optional(t.String()) }) },
  )

  .get(
    '/vehicles',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'inventory:read')
      return customers.listVehicles(ctx(tenantId, connectionKey), query.customer_id)
    },
    { query: t.Object({ customer_id: t.Optional(t.String()) }) },
  )
