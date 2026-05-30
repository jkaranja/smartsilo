import { LLM, z } from "@saas/llm";
import { kysely, setRls } from "@saas/db";
import type { Message } from "@saas/agent";

const KEEP_RECENT = 20;

const outputSchema = z.object({ output: z.string() });

export async function compressThreadMessages(
  messages: Message[],
  orgId: string,
  userId: string,
) {
  const old = messages.slice(0, -KEEP_RECENT);
  const recent = messages.slice(-KEEP_RECENT);

  const result = await LLM.llm.create({
    model: "claude-sonnet-4-6",
    maxTokens: 600,
    outputSchema,
    input: [
      {
        role: "user",
        content: `Summarise this business conversation history very concisely.
Focus on: decisions made, actions taken, outstanding items.
Omit small talk. Be factual.

History:
${old.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")}`,
      },
    ],
  });

  const compressed: Message[] = [
    { role: "user", content: "[Summary of earlier conversation]" },
    { role: "assistant", content: result.output },
    ...recent,
  ];

  await kysely.transaction().execute(async (trx) => {
    await setRls(trx, orgId);

    const thread = await trx
      .selectFrom("AgentThread")
      .select("id")
      .where("organizationId", "=", orgId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (!thread) return;

    const oldIds = await trx
      .selectFrom("AgentThreadMessage")
      .select("id")
      .where("threadId", "=", thread.id)
      .orderBy("createdAt", "asc")
      .limit(old.length)
      .execute();

    if (oldIds.length) {
      await trx
        .deleteFrom("AgentThreadMessage")
        .where(
          "id",
          "in",
          oldIds.map((r) => r.id),
        )
        .execute();
    }

    await trx
      .insertInto("AgentThreadMessage")
      .values([
        {
          id: crypto.randomUUID(),
          threadId: thread.id,
          role: "USER",
          content: JSON.stringify("[Summary of earlier conversation]"),
          createdAt: new Date(0),
        },
        {
          id: crypto.randomUUID(),
          threadId: thread.id,
          role: "ASSISTANT",
          content: JSON.stringify(result.output),
          createdAt: new Date(1),
        },
      ])
      .execute();
  });

  return compressed;
}
