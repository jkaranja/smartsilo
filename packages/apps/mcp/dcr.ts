import { Elysia, t } from 'elysia'
import { controlPlane } from '@saas/db'

export const dcrRoutes = new Elysia({ prefix: '/oauth' })

  // RFC 7591 Dynamic Client Registration
  .post('/register', async ({ body, set }) => {
    const { client_name, redirect_uris, grant_types, tenant_slug } = body

    if (!redirect_uris || redirect_uris.length === 0) {
      set.status = 400
      return { error: 'redirect_uris must be a non-empty array' }
    }

    let tenantId: string | null = null
    if (tenant_slug) {
      const tenant = await controlPlane
        .selectFrom('tenants')
        .select(['id'])
        .where('slug', '=', tenant_slug)
        .where('status', '=', 'active')
        .executeTakeFirst()

      if (!tenant) {
        set.status = 400
        return { error: `Tenant not found: ${tenant_slug}` }
      }
      tenantId = tenant.id
    }

    const resolvedGrantTypes = grant_types ?? ['authorization_code']

    const row = await controlPlane
      .insertInto('oauth_clients')
      .values({
        id:            crypto.randomUUID(),
        tenant_id:     tenantId,
        name:          client_name,
        redirect_uris: redirect_uris,
        grant_types:   resolvedGrantTypes,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    set.status = 201
    return {
      client_id:     row.id,
      client_name:   row.name,
      redirect_uris: row.redirect_uris,
      grant_types:   row.grant_types,
      created_at:    row.created_at,
    }
  }, {
    body: t.Object({
      client_name:   t.String(),
      redirect_uris: t.Array(t.String()),
      grant_types:   t.Optional(t.Array(t.String())),
      tenant_slug:   t.Optional(t.String()),
    }),
  })
