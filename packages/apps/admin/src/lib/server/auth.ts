import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { adminConfig } from "./config";
import { createAuth } from "./create-auth";

export const auth = createAuth(
  {
    databaseUrl: adminConfig.databaseUrl,
    secret: adminConfig.betterAuth.secret,
    host: adminConfig.host,
  },
  [sveltekitCookies(getRequestEvent)],
);
