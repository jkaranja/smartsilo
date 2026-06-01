import { createAuthClient } from "better-auth/client/svelte";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { clientConfig } from "./config";

export const authClient = createAuthClient({
  baseURL: clientConfig.host,
  plugins: [oauthProviderClient()],
});
