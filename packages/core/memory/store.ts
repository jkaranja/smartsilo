import { withTenant } from '@saas/db'
import type { Message } from '@saas/agent/types'
import { compressHistory } from './summarise'

const MAX_MESSAGES_BEFORE_SUMMARY = 50

export async function loadHistory(
  tenantId:      string,
  connectionKey: string,
  userId:        string,
): Promise<Message[]> {
  return withTenant(tenantId, connectionKey, async (db) => {
    const row = await db
      .selectFrom('agent_conversations')
      .select('messages')
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (!row) return []

    const messages = row.messages as Message[]

    if (messages.length > MAX_MESSAGES_BEFORE_SUMMARY) {
      return compressHistory(messages, tenantId, connectionKey, userId)
    }

    return messages
  })
}

export async function saveMessages(
  tenantId:      string,
  connectionKey: string,
  userId:        string,
  newMessages:   Message[],
): Promise<void> {
  return withTenant(tenantId, connectionKey, async (db) => {
    const existing = await db
      .selectFrom('agent_conversations')
      .select(['id', 'messages'])
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (existing) {
      const current  = existing.messages as Message[]
      const updated  = [...current, ...newMessages]

      await db
        .updateTable('agent_conversations')
        .set({
          messages:   JSON.stringify(updated),
          updated_at: new Date(),
        })
        .where('id', '=', existing.id)
        .execute()
    } else {
      await db
        .insertInto('agent_conversations')
        .values({
          id:        crypto.randomUUID(),
          tenant_id: tenantId,
          user_id:   userId,
          messages:  JSON.stringify(newMessages),
        })
        .execute()
    }
  })
}
