import { Elysia, t } from 'elysia'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import { DealershipService } from './service'

export const dealershipRoutes = new Elysia({ prefix: '/dealer' })
  .use(gatewayMiddleware)

  .get(
    '/listings',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'listings:read')
      return new DealershipService(tenantId, connectionKey).listListings(query.status, query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ status: t.Optional(t.String()), limit: t.Optional(t.String()) }) },
  )

  .get('/listings/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'listings:read')
    const result = await new DealershipService(tenantId, connectionKey).getListing(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/listings',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'listings:write')
      return new DealershipService(tenantId, connectionKey).createListing(
        body.vin, body.make, body.model, body.year, body.mileage, body.asking_price,
      )
    },
    {
      body: t.Object({
        vin:          t.String(),
        make:         t.String(),
        model:        t.String(),
        year:         t.Number(),
        mileage:      t.Optional(t.Number()),
        asking_price: t.Optional(t.Number()),
      }),
    },
  )

  .patch(
    '/listings/:id/status',
    async ({ tenantId, connectionKey, role, params, body }) => {
      requirePermission(role, 'listings:write')
      const result = await new DealershipService(tenantId, connectionKey).updateListingStatus(params.id, body.status)
      if (!result) return new Response('Not found', { status: 404 })
      return result
    },
    { body: t.Object({ status: t.String() }) },
  )

  .get(
    '/deals',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'deals:read')
      return new DealershipService(tenantId, connectionKey).listDeals(
        query.limit ? Number(query.limit) : undefined,
        query.include_closed === 'true',
      )
    },
    { query: t.Object({ limit: t.Optional(t.String()), include_closed: t.Optional(t.String()) }) },
  )

  .get('/deals/:id', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'deals:read')
    const result = await new DealershipService(tenantId, connectionKey).getDeal(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .post(
    '/deals',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'deals:write')
      return new DealershipService(tenantId, connectionKey).createDeal(
        body.listing_id, body.buyer_name, body.sale_price, body.financing_type,
      )
    },
    {
      body: t.Object({
        listing_id:    t.String(),
        buyer_name:    t.String(),
        sale_price:    t.Optional(t.Number()),
        financing_type: t.Optional(t.String()),
      }),
    },
  )

  .post('/deals/:id/close', async ({ tenantId, connectionKey, role, params }) => {
    requirePermission(role, 'deals:write')
    const result = await new DealershipService(tenantId, connectionKey).closeDeal(params.id)
    if (!result) return new Response('Not found', { status: 404 })
    return result
  })

  .get(
    '/trade-ins',
    async ({ tenantId, connectionKey, role, query }) => {
      requirePermission(role, 'trade_ins:read')
      return new DealershipService(tenantId, connectionKey).listTradeIns(query.limit ? Number(query.limit) : undefined)
    },
    { query: t.Object({ limit: t.Optional(t.String()) }) },
  )

  .post(
    '/trade-ins',
    async ({ tenantId, connectionKey, role, body }) => {
      requirePermission(role, 'trade_ins:write')
      return new DealershipService(tenantId, connectionKey).createTradeIn(
        body.vin, body.make, body.model, body.year, body.offered_value, body.listing_id,
      )
    },
    {
      body: t.Object({
        vin:           t.String(),
        make:          t.String(),
        model:         t.String(),
        year:          t.Number(),
        offered_value: t.Optional(t.Number()),
        listing_id:    t.Optional(t.String()),
      }),
    },
  )
