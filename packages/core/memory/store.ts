import { kysely, setRls } from "@saas/db";
import type { Message } from "@saas/agent";
import { compressThreadMessages } from "./util";

const MAX_MESSAGES_BEFORE_SUMMARY = 50;

export async function loadThreadMessages(
  orgId: string,
  userId: string,
): Promise<Message[]> {
  return kysely.transaction().execute(async (trx) => {
    await setRls(trx, orgId);

    const rows = await trx
      .selectFrom("AgentThreadMessage")
      .innerJoin("AgentThread", "AgentThread.id", "AgentThreadMessage.threadId")
      .select(["AgentThreadMessage.role", "AgentThreadMessage.content"])
      .where("AgentThread.organizationId", "=", orgId)
      .where("AgentThread.userId", "=", userId)
      .orderBy("AgentThreadMessage.createdAt", "asc")
      .execute();

    if (!rows.length) return [];

    const messages: Message[] = rows.map((r) => ({
      role: r.role.toLowerCase() as "user" | "assistant",
      content: r.content as any,
    }));

    if (messages.length > MAX_MESSAGES_BEFORE_SUMMARY) {
      return compressThreadMessages(messages, orgId, userId);
    }

    return messages;
  });
}

export async function saveMessages(
  orgId: string,
  userId: string,
  newMessages: Message[],
): Promise<void> {
  await kysely.transaction().execute(async (trx) => {
    await setRls(trx, orgId);

    let thread = await trx
      .selectFrom("AgentThread")
      .select("id")
      .where("organizationId", "=", orgId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (!thread) {
      const id = crypto.randomUUID();
      await trx
        .insertInto("AgentThread")
        .values({
          id,
          organizationId: orgId,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
      thread = { id };
    } else {
      await trx
        .updateTable("AgentThread")
        .set({ updatedAt: new Date() })
        .where("id", "=", thread.id)
        .execute();
    }

    await trx
      .insertInto("AgentThreadMessage")
      .values(
        newMessages.map((m) => ({
          id: crypto.randomUUID(),
          threadId: thread!.id,
          role: m.role.toUpperCase() as "USER" | "ASSISTANT",
          content: JSON.stringify(m.content),
          createdAt: new Date(),
        })),
      )
      .execute();
  });
}
