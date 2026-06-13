import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { mcpHandler, getAuthenticatedUser, getAuth } from "@saas/auth";
import { getMcpConfig } from "../config";
import { createServer } from "./mcp/server";
import { initServices } from "./init";

initServices();

const config = getMcpConfig();
const auth = getAuth();

const handleMcp = mcpHandler(
  { verifyOptions: { issuer: config.host, audience: config.host } },
  async (req, jwt) => {
    const user = await getAuthenticatedUser({ userId: jwt.sub! });

    const org = user?.organizations?.[0];

    if (!org) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ctx = { orgId: org.id, connectionKey: org.id };

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const mcpServer = createServer(ctx);
    await mcpServer.connect(transport);

    return transport.handleRequest(req);
  },
);

export const app = new Elysia()
  .use(cors())

  .get("/.well-known/oauth-protected-resource", () => ({
    resource: config.host,
    authorization_servers: [config.host],
  }))

  .all("/mcp", ({ request }) => handleMcp(request))

  // Auth handler as root-level fallback — serves /.well-known/oauth-authorization-server,
  // /oauth2/authorize, /oauth2/token, /jwks, etc. at paths MCP clients expect from the issuer URL.
  .mount(auth.handler);
