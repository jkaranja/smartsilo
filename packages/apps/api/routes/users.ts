import { Elysia, t } from 'elysia'
import { gatewayMiddleware } from '@saas/auth/middleware'
import { requirePermission } from '@saas/auth/rbac'
import { controlPlane, withTenant } from '@saas/db'
import { sendInviteEmail } from '@saas/worker/notifications'

const PLATFORM_URL = process.env.PLATFORM_URL ?? 'https://platform.com'

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(gatewayMiddleware)

  // POST /users/invite — send email invite to a new staff member
  .post('/invite', async ({ body, tenantId, tenantSlug, connectionKey, userId, role, set }) => {
    requirePermission(role, 'users:invite')

    const { email, staffRole } = body

    // Reject if already a member of this tenant
    const alreadyMember = await withTenant(tenantId, connectionKey, async (db) => {
      return db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst()
    })

    if (alreadyMember) {
      set.status = 409
      return { error: 'User is already a member of this tenant' }
    }

    // Reject if a pending (non-expired) invite already exists
    const existingInvite = await controlPlane
      .selectFrom('tenant_invites')
      .select('id')
      .where('tenant_id',   '=',   tenantId)
      .where('email',       '=',   email)
      .where('accepted_at', 'is',  null)
      .where('expires_at',  '>',   new Date())
      .executeTakeFirst()

    if (existingInvite) {
      set.status = 409
      return { error: 'An invite is already pending for this email' }
    }

    const token   = crypto.randomUUID()
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await controlPlane
      .insertInto('tenant_invites')
      .values({
        id:         crypto.randomUUID(),
        tenant_id:  tenantId,
        email,
        role:       staffRole,
        token,
        invited_by: userId,
        expires_at: expires,
      })
      .execute()

    const inviteUrl = `${PLATFORM_URL}/accept-invite?token=${token}`
    await sendInviteEmail({ email, inviteUrl, tenantSlug, role: staffRole })

    return { message: `Invite sent to ${email}`, expiresAt: expires }
  }, {
    body: t.Object({
      email:     t.String({ format: 'email' }),
      staffRole: t.String(),
    }),
  })

  // POST /users/invites/:id/resend — extend and resend an existing invite
  .post('/invites/:id/resend', async ({ params, tenantId, tenantSlug, role }) => {
    requirePermission(role, 'users:invite')

    const invite = await controlPlane
      .updateTable('tenant_invites')
      .set({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      .where('id',         '=',  params.id)
      .where('tenant_id',  '=',  tenantId)
      .where('accepted_at','is', null)
      .returningAll()
      .executeTakeFirstOrThrow()

    const inviteUrl = `${PLATFORM_URL}/accept-invite?token=${invite.token}`
    await sendInviteEmail({ email: invite.email, inviteUrl, tenantSlug, role: invite.role })

    return { message: `Invite resent to ${invite.email}` }
  })

  // GET /users — list all members of this tenant
  .get('/', async ({ tenantId, connectionKey, role }) => {
    requirePermission(role, 'users:read')

    return withTenant(tenantId, connectionKey, async (db) => {
      return db
        .selectFrom('tenant_memberships')
        .innerJoin('users', 'users.id', 'tenant_memberships.user_id')
        .select([
          'users.id',
          'users.email',
          'users.name',
          'tenant_memberships.role',
          'tenant_memberships.created_at',
        ])
        .orderBy('users.name')
        .execute()
    })
  })

  // GET /users/invites — list pending invites
  .get('/invites', async ({ tenantId, role }) => {
    requirePermission(role, 'users:read')

    return controlPlane
      .selectFrom('tenant_invites')
      .select(['id', 'email', 'role', 'expires_at', 'created_at'])
      .where('tenant_id',   '=',  tenantId)
      .where('accepted_at', 'is', null)
      .where('expires_at',  '>',  new Date())
      .orderBy('created_at', 'desc')
      .execute()
  })

  // DELETE /users/invites/:id — revoke a pending invite
  .delete('/invites/:id', async ({ params, tenantId, role, set }) => {
    requirePermission(role, 'users:invite')

    const deleted = await controlPlane
      .deleteFrom('tenant_invites')
      .where('id',         '=',  params.id)
      .where('tenant_id',  '=',  tenantId)
      .where('accepted_at','is', null)
      .returningAll()
      .executeTakeFirst()

    if (!deleted) {
      set.status = 404
      return { error: 'Invite not found or already accepted' }
    }

    return { message: 'Invite revoked' }
  })

  // PATCH /users/:id/role — change a member's role
  .patch('/:id/role', async ({ params, body, tenantId, connectionKey, role, set }) => {
    requirePermission(role, 'users:manage')

    return withTenant(tenantId, connectionKey, async (db) => {
      const updated = await db
        .updateTable('tenant_memberships')
        .set({ role: body.role })
        .where('user_id', '=', params.id)
        .returningAll()
        .executeTakeFirst()

      if (!updated) {
        set.status = 404
        return { error: 'Member not found' }
      }

      return { message: 'Role updated' }
    })
  }, {
    body: t.Object({ role: t.String() }),
  })

  // DELETE /users/:id — remove a member (does not delete their account)
  .delete('/:id', async ({ params, tenantId, connectionKey, userId, role, set }) => {
    requirePermission(role, 'users:manage')

    if (params.id === userId) {
      set.status = 400
      return { error: 'You cannot remove yourself' }
    }

    return withTenant(tenantId, connectionKey, async (db) => {
      const deleted = await db
        .deleteFrom('tenant_memberships')
        .where('user_id', '=', params.id)
        .returningAll()
        .executeTakeFirst()

      if (!deleted) {
        set.status = 404
        return { error: 'Member not found' }
      }

      return { message: 'Member removed' }
    })
  })
