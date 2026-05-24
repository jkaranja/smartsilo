import { Elysia, t } from 'elysia'
import { auth } from '@saas/auth'
import { controlPlane, withTenant } from '@saas/db'

export const acceptInviteRoutes = new Elysia()

  // GET /accept-invite?token=… — validate token and return invite details for the UI
  .get('/accept-invite', async ({ query, set }) => {
    const invite = await controlPlane
      .selectFrom('tenant_invites')
      .innerJoin('tenants', 'tenants.id', 'tenant_invites.tenant_id')
      .select([
        'tenant_invites.email',
        'tenant_invites.role',
        'tenant_invites.expires_at',
        'tenants.name as tenant_name',
        'tenants.industry',
      ])
      .where('tenant_invites.token',       '=',  query.token)
      .where('tenant_invites.accepted_at', 'is', null)
      .where('tenant_invites.expires_at',  '>',  new Date())
      .executeTakeFirst()

    if (!invite) {
      set.status = 404
      return { error: 'Invite not found or expired' }
    }

    return {
      email:      invite.email,
      role:       invite.role,
      tenantName: invite.tenant_name,
      industry:   invite.industry,
      expiresAt:  invite.expires_at,
    }
  }, {
    query: t.Object({ token: t.String() }),
  })

  // POST /accept-invite — invitee completes registration
  .post('/accept-invite', async ({ body, set }) => {
    const { token, name, password } = body

    // 1. Validate invite
    const invite = await controlPlane
      .selectFrom('tenant_invites')
      .innerJoin('tenants', 'tenants.id', 'tenant_invites.tenant_id')
      .select([
        'tenant_invites.id as invite_id',
        'tenant_invites.tenant_id',
        'tenant_invites.email',
        'tenant_invites.role',
        'tenant_invites.token',
        'tenants.slug',
        'tenants.connection_key',
      ])
      .where('tenant_invites.token',       '=',  token)
      .where('tenant_invites.accepted_at', 'is', null)
      .where('tenant_invites.expires_at',  '>',  new Date())
      .executeTakeFirst()

    if (!invite) {
      set.status = 404
      return { error: 'Invite not found or expired' }
    }

    // 2. Create Better Auth identity
    const baResult = await auth.api.signUpEmail({
      body: { name, email: invite.email, password },
    })

    // Email already registered on another tenant — link the existing identity instead
    if (baResult.error?.code === 'EMAIL_ALREADY_EXISTS' || baResult.error?.status === 422) {
      return linkExistingUser({ invite, set })
    }

    if (baResult.error) {
      set.status = 400
      return { error: baResult.error.message }
    }

    // 3. Create platform user + membership in the right DB
    await withTenant(invite.tenant_id, invite.connection_key, async (db) => {
      const user = await db
        .insertInto('users')
        .values({
          id:             crypto.randomUUID(),
          tenant_id:      invite.tenant_id,
          email:          invite.email,
          name,
          better_auth_id: baResult.data!.user.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      await db
        .insertInto('tenant_memberships')
        .values({
          id:        crypto.randomUUID(),
          tenant_id: invite.tenant_id,
          user_id:   user.id,
          role:      invite.role,
        })
        .execute()
    })

    // 4. Mark invite accepted
    await controlPlane
      .updateTable('tenant_invites')
      .set({ accepted_at: new Date() })
      .where('id', '=', invite.invite_id)
      .execute()

    // 5. Sign them in automatically and return the session token
    const session = await auth.api.signInEmail({
      body: { email: invite.email, password },
    })

    return {
      message:    'Account created',
      token:      session.data?.token,
      redirectTo: `https://${invite.slug}.platform.com`,
    }
  }, {
    body: t.Object({
      token:    t.String(),
      name:     t.String({ minLength: 2 }),
      password: t.String({ minLength: 8 }),
    }),
  })


// Handles the case where the invitee already has a Better Auth account on another tenant.
// We find their existing Better Auth identity, create a fresh users row in the new
// tenant (same better_auth_id, different tenant_id), and link the membership.
async function linkExistingUser(opts: {
  invite: {
    invite_id: string
    tenant_id: string
    email:     string
    role:      string
    token:     string
    slug:      string
    connection_key: string
  }
  set: any
}) {
  const { invite, set } = opts

  const baUser = await auth.api.getUserByEmail({ query: { email: invite.email } })
  if (!baUser?.id) {
    set.status = 500
    return { error: 'Unexpected error resolving existing account' }
  }

  await withTenant(invite.tenant_id, invite.connection_key, async (db) => {
    const user = await db
      .insertInto('users')
      .values({
        id:             crypto.randomUUID(),
        tenant_id:      invite.tenant_id,
        email:          invite.email,
        name:           baUser.name ?? null,
        better_auth_id: baUser.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await db
      .insertInto('tenant_memberships')
      .values({
        id:        crypto.randomUUID(),
        tenant_id: invite.tenant_id,
        user_id:   user.id,
        role:      invite.role,
      })
      .execute()
  })

  await controlPlane
    .updateTable('tenant_invites')
    .set({ accepted_at: new Date() })
    .where('id', '=', invite.invite_id)
    .execute()

  return {
    message:    'Added to tenant — sign in with your existing account',
    redirectTo: `https://${invite.slug}.platform.com/login`,
  }
}
