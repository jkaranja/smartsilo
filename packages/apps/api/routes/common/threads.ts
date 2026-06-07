import { Elysia } from "elysia";
import { authPlugin } from "../../server/auth-plugin";

export const threadsRouter = new Elysia({ name: "threads-router" })
  .use(authPlugin)

  .get(
    "/threads",
    async ({ user, db }) => {
      if (!user?.organizations?.length) throw new Error("No organization found");
      const org = user.organizations[0]!;

      return db
        .selectFrom("AgentThread")
        .select(["topic", "updatedAt", "lastBriefedAt"])
        .where("organizationId", "=", org.id)
        .where("userId", "=", user.id)
        .orderBy("updatedAt", "desc")
        .execute();
    },
    { auth: true },
  );
