import { Elysia } from "elysia";
import { getAuth, getAuthenticatedUser } from "@saas/auth";
import { kysely } from "@saas/db";

export const authPlugin = new Elysia({ name: "auth-plugin" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await getAuth().api.getSession({ headers });
      if (!session) return status(401);
      return {
        user: await getAuthenticatedUser({ userId: session.user.id }),
        db: kysely,
      };
    },
  },
});
