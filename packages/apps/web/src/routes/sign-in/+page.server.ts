import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { isMcpOAuthFlow } from "$lib/oauth";

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) {
    if (isMcpOAuthFlow(url.searchParams)) {
      redirect(302, `/consent${url.search}`);
    }

    redirect(302, "/agent");
  }
};
