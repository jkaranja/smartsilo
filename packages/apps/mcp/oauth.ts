import { Elysia, t } from 'elysia'
import { controlPlane } from '@saas/db'
import { Cache } from '@saas/cache'

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export const oauthRoutes = new Elysia({ prefix: '/oauth' })

  // Authorization endpoint — issues an auth code for the PKCE flow
  .get('/authorize', async ({ query, set }) => {
    const { client_id, redirect_uri, code_challenge, code_challenge_method, state, tenant_slug, scope } = query

    if (code_challenge_method !== 'S256') {
      set.status = 400
      return { error: 'Only S256 code_challenge_method is supported' }
    }

    const client = await controlPlane
      .selectFrom('oauth_clients')
      .select(['id', 'redirect_uris'])
      .where('id', '=', client_id)
      .executeTakeFirst()

    if (!client) {
      set.status = 400
      return { error: 'Unknown client_id' }
    }

    if (!client.redirect_uris.includes(redirect_uri)) {
      set.status = 400
      return { error: 'redirect_uri not registered for this client' }
    }

    const code = generateToken()

    await Cache.redis.set(
      `oauth:code:${code}`,
      JSON.stringify({ clientId: client_id, redirectUri: redirect_uri, codeChallenge: code_challenge, tenantSlug: tenant_slug, scope: scope ?? '' }),
      { ex: 600 },
    )

    return { code, state }
  }, {
    query: t.Object({
      client_id:             t.String(),
      redirect_uri:          t.String(),
      code_challenge:        t.String(),
      code_challenge_method: t.String(),
      state:                 t.Optional(t.String()),
      tenant_slug:           t.String(),
      scope:                 t.Optional(t.String()),
    }),
  })

  // Token exchange — PKCE verification + MCP token issuance
  .post('/token', async ({ body, set }) => {
    const { grant_type, code, code_verifier, client_id, redirect_uri } = body

    if (grant_type !== 'authorization_code') {
      set.status = 400
      return { error: 'Unsupported grant_type' }
    }

    const raw = await Cache.redis.get<string>(`oauth:code:${code}`)
    if (!raw) {
      set.status = 400
      return { error: 'Invalid or expired code' }
    }

    const stored = JSON.parse(raw) as {
      clientId: string
      redirectUri: string
      codeChallenge: string
      tenantSlug: string
      scope: string
    }

    if (stored.clientId !== client_id || stored.redirectUri !== redirect_uri) {
      set.status = 400
      return { error: 'client_id or redirect_uri mismatch' }
    }

    const verifierHash = await sha256Base64Url(code_verifier)
    if (verifierHash !== stored.codeChallenge) {
      set.status = 400
      return { error: 'code_verifier does not match code_challenge' }
    }

    // Resolve tenant_id from slug via control plane
    const tenant = await controlPlane
      .selectFrom('tenants')
      .select(['id'])
      .where('slug', '=', stored.tenantSlug)
      .executeTakeFirst()

    if (!tenant) {
      set.status = 400
      return { error: 'Tenant not found' }
    }

    await Cache.redis.del(`oauth:code:${code}`)

    const token = generateToken()
    const tokenHash = await sha256Hex(token)

    await controlPlane
      .insertInto('mcp_tokens')
      .values({
        id:         crypto.randomUUID(),
        tenant_id:  tenant.id,
        user_id:    '00000000-0000-0000-0000-000000000000',
        token_hash: tokenHash,
        scopes:     stored.scope ? stored.scope.split(' ') : [],
        name:       'External Client',
      })
      .execute()

    return {
      access_token: token,
      token_type:   'Bearer',
      scope:        stored.scope,
    }
  }, {
    body: t.Object({
      grant_type:    t.String(),
      code:          t.String(),
      code_verifier: t.String(),
      client_id:     t.String(),
      redirect_uri:  t.String(),
    }),
  })

  // Revoke a token
  .post('/revoke', async ({ body }) => {
    const tokenHash = await sha256Hex(body.token)
    await controlPlane
      .updateTable('mcp_tokens')
      .set({ revoked_at: new Date() })
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .execute()
    return { revoked: true }
  }, {
    body: t.Object({ token: t.String() }),
  })
