import { Elysia, t } from 'elysia'
import { auth } from '@saas/auth'
import { controlPlane, withTenant } from '@saas/db'
import { Cache } from '@saas/cache'
import type { Industry } from '@saas/types'

export const registerRoutes = new Elysia({ prefix: '/auth' })

  // POST /auth/register — owner self-signup
  // Writes to control plane DB + pool DB in one request.
  .post('/register', async ({ body, set }) => {
    // 1. Validate slug availability
    const existing = await controlPlane
      .selectFrom('tenants')
      .select('id')
      .where('slug', '=', body.slug)
      .executeTakeFirst()

    if (existing) {
      set.status = 409
      return { error: 'Slug already taken' }
    }

    // 2. Create tenant routing record in control plane
    const tenant = await controlPlane
      .insertInto('tenants')
      .values({
        id:             crypto.randomUUID(),
        slug:           body.slug,
        name:           body.companyName,
        industry:       body.industry.toUpperCase() as Industry,
        plan:           'STARTER',
        db_tier:        'POOL',
        connection_key: 'pool-main',
        status:         'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // 3. Create Better Auth identity (writes to pool: user + account tables)
    const baResult = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: body.password },
    })

    if (baResult.error) {
      await controlPlane
        .deleteFrom('tenants')
        .where('id', '=', tenant.id)
        .execute()
      set.status = 400
      return { error: baResult.error.message }
    }

    // 4. Create platform user + owner membership (pool DB, RLS-scoped)
    await withTenant(tenant.id, 'pool-main', async (db) => {
      const user = await db
        .insertInto('users')
        .values({
          id:             crypto.randomUUID(),
          tenant_id:      tenant.id,
          email:          body.email,
          name:           body.name,
          better_auth_id: baResult.data!.user.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      await db
        .insertInto('tenant_memberships')
        .values({
          id:        crypto.randomUUID(),
          tenant_id: tenant.id,
          user_id:   user.id,
          role:      'owner',
        })
        .execute()
    })

    // 5. Warm the tenant cache so the next request hits Redis
    await Cache.tenant.set(tenant.slug, {
      id:            tenant.id,
      slug:          tenant.slug,
      name:          tenant.name,
      industry:      tenant.industry as Industry,
      plan:          tenant.plan as any,
      dbTier:        'POOL',
      connectionKey: 'pool-main',
      status:        tenant.status,
      createdAt:     tenant.created_at,
    })

    return {
      tenantId: tenant.id,
      slug:     tenant.slug,
      industry: tenant.industry,
    }
  }, {
    body: t.Object({
      slug:        t.String({ minLength: 2, maxLength: 48 }),
      companyName: t.String({ minLength: 2 }),
      industry:    t.Union([t.Literal('garage'), t.Literal('clinic'), t.Literal('dealership')]),
      name:        t.String({ minLength: 2 }),
      email:       t.String({ format: 'email' }),
      password:    t.String({ minLength: 8 }),
    }),
  })
