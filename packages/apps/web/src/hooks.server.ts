import { redirect } from "@sveltejs/kit";
import { getAuthSession } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";

const publicPaths = ["/sign-in", "/invitations", "/agent"];

export const handle: Handle = async ({ event, resolve }) => {
  const isPublic = publicPaths.some((p) => event.url.pathname.startsWith(p));

  const session = await getAuthSession(event.request.headers);

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  if (!isPublic && !event.locals.user) {
    redirect(302, "/sign-in");
  }

  return resolve(event);
};
