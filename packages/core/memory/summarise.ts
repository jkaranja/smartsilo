import Anthropic from '@anthropic-ai/sdk'
import { withTenant } from '@saas/db'
import type { Message } from '@saas/agent/types'

const anthropic = new Anthropic()

const KEEP_RECENT = 20

export async function compressHistory(
  messages:      Message[],
  tenantId:      string,
  connectionKey: string,
  userId:        string,
): Promise<Message[]> {
  const old    = messages.slice(0, -KEEP_RECENT)
  const recent = messages.slice(-KEEP_RECENT)

  const summary = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role:    'user',
      content: `Summarise this business conversation history very concisely.
Focus on: decisions made, actions taken, outstanding items.
Omit small talk. Be factual.

History:
${old.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n')}`,
    }],
  })

  const summaryText = summary.content[0].type === 'text'
    ? summary.content[0].text
    : ''

  const compressed: Message[] = [
    { role: 'user',      content: '[Summary of earlier conversation]' },
    { role: 'assistant', content: summaryText },
    ...recent,
  ]

  await withTenant(tenantId, connectionKey, async (db) => {
    await db
      .updateTable('agent_conversations')
      .set({ messages: JSON.stringify(compressed) })
      .where('user_id', '=', userId)
      .execute()
  })

  return compressed
}
