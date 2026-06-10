import { Elysia } from "elysia";
import { contextPlugin } from "../../server";

export const threadsRouter = new Elysia({ name: "threads-router" })
  .use(contextPlugin)

  .get(
    "/threads",
    async ({ user, db }) => {
      if (!user?.organizations?.length) throw new Error("No organization found");
      const org = user.organizations[0]!;

      return db
        .selectFrom("AgentThread")
        .select(["context", "updatedAt", "lastBriefedAt"])
        .where("organizationId", "=", org.id)
        .where("userId", "=", user.id)
        .orderBy("updatedAt", "desc")
        .execute();
    },
    
  );
