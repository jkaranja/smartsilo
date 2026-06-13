import { createAuthClient } from "better-auth/client";
import { ssoClient } from "@better-auth/sso/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { publicWebConfig } from "./config";

export const authClient = createAuthClient({
  baseURL: publicWebConfig.apiUrl,
  basePath: "/auth",
  plugins: [ssoClient()],
});

// Separate client for the MCP server's OAuth provider endpoints (consent, authorize, token).
export const mcpAuthClient = createAuthClient({
  baseURL: publicWebConfig.mcpUrl,
  basePath: "/",
  plugins: [oauthProviderClient()],
});
