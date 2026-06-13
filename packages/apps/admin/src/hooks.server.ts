import { auth } from "$lib/server/auth";
import { adminConfig } from "$lib/server/config";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { kyselyClient } from "@saas/db";
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";

const kysely = kyselyClient({
  connectionString: adminConfig.managedDatabaseUrl,
});

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;
  event.locals.db = kysely;

  if (!event.locals.user && event.url.pathname !== "/login") {
    redirect(302, "/login");
  }

  return svelteKitHandler({ event, resolve, auth, building });
};
