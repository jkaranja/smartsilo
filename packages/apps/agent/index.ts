import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { sql } from 'kysely'
import { auth } from '@saas/auth'
import { resolveTenant, getDb } from '@saas/db'
import { getPermissions } from '@saas/auth/rbac'
import { runAgentLoop } from '@saas/agent/runtime'
import { loadHistory, saveMessages } from '@saas/memory'
import { ApprovalChannel } from '@saas/agent/approval'

interface SessionData {
  tenantId:        string
  tenantName:      string
  tenantSlug:      string
  industry:        string
  plan:            string
  connectionKey:   string
  userId:          string
  userName:        string
  role:            string
  permissions:     string[]
  approvalChannel: ApprovalChannel
}

const PORT = Number(process.env.AGENT_PORT ?? 3003)

// https://better-auth.com/docs/plugins/agent-auth

new Elysia()
  .use(cors({
    origin:      process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }))

  .ws('/agent/:tenantSlug', {

    async upgrade({ params, headers, set }) {
      const tenant = await resolveTenant(params.tenantSlug).catch(() => null)
      if (!tenant) { set.status = 404; return }

      const session = await auth.api.getSession({ headers })
      if (!session?.user) { set.status = 401; return }

      const db = getDb(tenant.connectionKey)
      const membership = await db.transaction().execute(async (trx) => {
        await trx.executeQuery(
          sql`SET LOCAL "app.current_tenant" = ${tenant.id}`.compile(trx)
        )
        return trx
          .selectFrom('tenant_memberships')
          .innerJoin('users', 'users.id', 'tenant_memberships.user_id')
          .select(['users.id as user_id', 'users.name as user_name', 'tenant_memberships.role'])
          .where('users.better_auth_id', '=', session.user.id)
          .executeTakeFirst()
      })

      if (!membership) { set.status = 403; return }

      return {
        data: {
          tenantId:        tenant.id,
          tenantName:      tenant.name,
          tenantSlug:      tenant.slug,
          industry:        tenant.industry,
          plan:            tenant.plan,
          connectionKey:   tenant.connectionKey,
          userId:          membership.user_id,
          userName:        membership.user_name ?? session.user.name ?? 'User',
          role:            membership.role,
          permissions:     getPermissions(membership.role),
          approvalChannel: new ApprovalChannel(),
        } satisfies SessionData,
      }
    },

    async message(ws, raw) {
      const ctx = ws.data as SessionData
      let event: { type: string; [key: string]: unknown }

      try {
        event = JSON.parse(raw as string)
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
        return
      }

      if (event.type === 'approval_response') {
        ctx.approvalChannel.resolve(event.approvalId as string, event.approved as boolean)
        return
      }

      if (event.type === 'message') {
        const userMessage = (event.text as string)?.trim()
        if (!userMessage) return

        const history = await loadHistory(ctx.tenantId, ctx.connectionKey, ctx.userId)
        const assistantChunks: string[] = []

        try {
          for await (const streamEvent of runAgentLoop(ctx, userMessage, history)) {
            ws.send(JSON.stringify(streamEvent))
            if (streamEvent.type === 'text_delta') assistantChunks.push(streamEvent.text)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Agent error'
          ws.send(JSON.stringify({ type: 'error', message }))
        }

        await saveMessages(ctx.tenantId, ctx.connectionKey, ctx.userId, [
          { role: 'user',      content: userMessage },
          { role: 'assistant', content: assistantChunks.join('') },
        ])
      }
    },

    close(ws) {
      (ws.data as SessionData).approvalChannel?.cleanup()
    },

    error(_ws, error) {
      console.error('WebSocket error:', error)
    },
  })

  .listen(PORT)

console.log(`Agent WebSocket running on port ${PORT}`)
