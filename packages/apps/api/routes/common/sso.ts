import { t } from 'elysia'
import { requirePermission, getAuth } from '@saas/auth'
import { app } from '../../server/app'

// GET /api/settings/sso — get current SSO provider for the org
app.get(
  '/api/settings/sso',
  async ({ user, request, set }) => {
    if (!user?.organizations?.length) {
      set.status = 403
      return { error: 'No organization found' }
    }
    const org = user.organizations[0]!
    requirePermission(org.role.toLowerCase() as any, 'settings:read')

    const result = await getAuth().api.getSSOProvider({
      headers: request.headers,
      query: { organizationId: org.id },
    })

    return result ?? null
  },
  { auth: true },
)

// POST /api/settings/sso — register or update the SSO provider for the org
app.post(
  '/api/settings/sso',
  async ({ body, user, request, set }) => {
    if (!user?.organizations?.length) {
      set.status = 403
      return { error: 'No organization found' }
    }
    const org = user.organizations[0]!
    requirePermission(org.role.toLowerCase() as any, 'settings:manage')

    return getAuth().api.registerSSOProvider({
      headers: request.headers,
      body: {
        providerId: `org-${org.id}`,
        issuer: body.issuer,
        domain: body.domain,
        oidcConfig: {
          clientId: body.clientId,
          clientSecret: body.clientSecret,
        },
        organizationId: org.id,
      },
    })
  },
  {
    auth: true,
    body: t.Object({
      issuer: t.String(),
      domain: t.String(),
      clientId: t.String(),
      clientSecret: t.String(),
    }),
  },
)

// DELETE /api/settings/sso — remove the SSO provider for the org
app.delete(
  '/api/settings/sso',
  async ({ user, request, set }) => {
    if (!user?.organizations?.length) {
      set.status = 403
      return { error: 'No organization found' }
    }
    const org = user.organizations[0]!
    requirePermission(org.role.toLowerCase() as any, 'settings:manage')

    await getAuth().api.deleteSSOProvider({
      headers: request.headers,
      query: { providerId: `org-${org.id}` },
    })

    return { message: 'SSO provider removed' }
  },
  { auth: true },
)
