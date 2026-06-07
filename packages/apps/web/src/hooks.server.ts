import { redirect } from "@sveltejs/kit";
import { webConfig } from "$lib/server/config";
import type { Handle } from "@sveltejs/kit";

const publicPaths = ["/sign-in", "/invitations", "/agent"];

export const handle: Handle = async ({ event, resolve }) => {
  const isPublic = publicPaths.some((p) => event.url.pathname.startsWith(p));

  const res = await fetch(`${webConfig.apiUrl}/auth/session`, {
    headers: event.request.headers,
  });

  const session = res.ok ? await res.json() : null;

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  if (!isPublic && !event.locals.user) {
    redirect(302, "/sign-in");
  }

  return resolve(event);
};
