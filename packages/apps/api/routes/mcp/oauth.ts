import {
  discoverOAuthServerInfo,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { requirePermission } from "@saas/auth";
import { setRls, kysely } from "@saas/db";
import { getApiConfig } from "../../config";
import { app } from "../../server/app";

const callbackUrl = () => `${getApiConfig().host}/api/mcp/callback`;
const clientMetaUrl = () => `${getApiConfig().host}/api/mcp/client`;

// GET /api/mcp/client — SEP-991 client metadata document.
// client_id MUST equal this URL exactly (https scheme + path required).
app.get("/api/mcp/client", () => {
  const url = clientMetaUrl();
  return {
    client_id: url,
    client_name: "SmartSilo Agent",
    redirect_uris: [callbackUrl()],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
});

// POST /api/mcp/:id/authorize — start OAuth flow for a server
app.post(
  "/api/mcp/:id/authorize",
  async ({ params, user, db, set }) => {
    if (!user?.organizations?.length) {
      set.status = 403;
      return { error: "No organization found" };
    }
    const org = user.organizations[0]!;
    requirePermission(org.role.toLowerCase() as any, "integrations:manage");

    const server = await db.transaction().execute(async (trx) => {
      await setRls(trx, org.id);
      return trx
        .selectFrom("McpServer")
        .selectAll()
        .where("id", "=", params.id)
        .where("organizationId", "=", org.id)
        .where("type", "=", "EXTERNAL")
        .executeTakeFirst();
    });

    if (!server) {
      set.status = 404;
      return { error: "Server not found" };
    }

    // 1. Discover auth server from /.well-known/oauth-protected-resource
    const discoveryState = await discoverOAuthServerInfo(server.serverUrl);

    // 2. Resolve client identity
    let clientId = server.oauthClientId;
    let clientSecret = server.oauthClientSecret;

    if (!clientId) {
      if (
        discoveryState.authorizationServerMetadata
          ?.client_id_metadata_document_supported
      ) {
        // SEP-991: server supports URL-based client IDs — DCR is skipped.
        // Our metadata document URL becomes the client_id directly.
        clientId = clientMetaUrl();
        clientSecret = null;
      } else {
        const registered = await registerClient(
          discoveryState.authorizationServerUrl,
          {
            metadata: discoveryState.authorizationServerMetadata,
            clientMetadata: {
              client_name: "SmartSilo Agent",
              redirect_uris: [callbackUrl()],
              grant_types: ["authorization_code", "refresh_token"],
              response_types: ["code"],
            },
          },
        );
        clientId = registered.client_id;
        clientSecret = registered.client_secret ?? null;
      }
    }

    // 3. Build PKCE authorization URL
    const { authorizationUrl, codeVerifier } = await startAuthorization(
      discoveryState.authorizationServerUrl,
      {
        metadata: discoveryState.authorizationServerMetadata,
        clientInformation: {
          client_id: clientId,
          client_secret: clientSecret ?? undefined,
        },
        redirectUrl: callbackUrl(),
        scope: server.scopes?.join(" ") ?? undefined,
        state: server.id,
      },
    );

    // 4. Persist client identity + PKCE verifier + discovery state
    await db.transaction().execute(async (trx) => {
      await setRls(trx, org.id);
      await trx
        .updateTable("McpServer")
        .set({
          oauthClientId: clientId,
          oauthClientSecret: clientSecret,
          codeVerifier,
          discoveryState: discoveryState as any,
          updatedAt: new Date(),
        })
        .where("id", "=", server.id)
        .execute();
    });

    return { authUrl: authorizationUrl.toString() };
  },
  { auth: true },
);

// GET /api/mcp/callback — OAuth callback (no auth — incoming redirect from external service)
app.get("/api/mcp/callback", async ({ query, set }) => {
  const { code, state, error } = query as Record<string, string>;

  if (error) {
    set.status = 302;
    set.headers["Location"] =
      `${getApiConfig().webUrl}/mcp?error=${encodeURIComponent(error)}`;
    return;
  }

  if (!code || !state) {
    set.status = 400;
    return { error: "Missing code or state" };
  }

  const server = await kysely
    .selectFrom("McpServer")
    .selectAll()
    .where("id", "=", state)
    .where("type", "=", "EXTERNAL")
    .executeTakeFirst();

  if (
    !server?.oauthClientId ||
    !server.codeVerifier ||
    !server.discoveryState
  ) {
    set.status = 400;
    return { error: "Invalid or expired OAuth state" };
  }

  const discoveryState = server.discoveryState as any;

  const tokens = await exchangeAuthorization(
    discoveryState.authorizationServerUrl,
    {
      metadata: discoveryState.authorizationServerMetadata,
      clientInformation: {
        client_id: server.oauthClientId,
        client_secret: server.oauthClientSecret ?? undefined,
      },
      authorizationCode: code,
      codeVerifier: server.codeVerifier,
      redirectUri: callbackUrl(),
    },
  );

  await kysely
    .updateTable("McpServer")
    .set({
      authToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      codeVerifier: null,
      isActive: true,
      updatedAt: new Date(),
    })
    .where("id", "=", state)
    .execute();

  set.status = 302;
  set.headers["Location"] = `${getApiConfig().webUrl}/mcp?connected=1`;
});
