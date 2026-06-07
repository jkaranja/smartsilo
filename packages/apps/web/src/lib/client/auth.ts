import { createAuthClient } from "better-auth/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { publicWebConfig } from "./config";

export const authClient = createAuthClient({
  baseURL: publicWebConfig.apiUrl,
  basePath: "/auth",
  plugins: [oauthProviderClient()],
});
