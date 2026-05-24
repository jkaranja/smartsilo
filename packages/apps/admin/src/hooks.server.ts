import { auth } from '$lib/server/auth';
import { adminConfig } from '$lib/server/config';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { db } from '@saas/db';
import type { Handle } from '@sveltejs/kit';

const kysely = db({ connectionString: adminConfig.databaseUrl });

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  event.locals.session = session?.session ?? null;
  event.locals.user    = session?.user    ?? null;
  event.locals.db      = kysely;

  return svelteKitHandler({ event, resolve, auth, building });
};
