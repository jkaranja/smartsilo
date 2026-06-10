import { Elysia } from "elysia";
import { getAuth, getAuthenticatedUser } from "@saas/auth";
import { kysely } from "@saas/db";

export const contextPlugin = new Elysia({ name: "context-plugin" }).resolve(
  // resolve() defaults to "local" scope — runs only for routes directly inside the plugin.
  // Since this plugin has no routes of its own, local scope means it never fires.
  // "global" makes it run for all routes across every plugin that uses this instance.
  // https://elysiajs.com/essential/plugin.html#scope-level
  { as: "global" },
  async ({ request: { headers } }) => {
    const session = await getAuth().api.getSession({ headers });

    const user = session
      ? await getAuthenticatedUser({ userId: session.user.id })
      : null;

    return { session, user, db: kysely };
  },
);
