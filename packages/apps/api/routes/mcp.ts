import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import { getApiConfig } from "../config";
import { app } from "../server/app";

app.group("/api/settings/mcp", (app) =>
  app

    // GET /api/settings/mcp — MCP URL for this org + connected external servers
    .get(
      "/",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "settings:read");

        const { mcpBaseUrl } = getApiConfig();

        const externalServers = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .selectFrom("ExternalMcpServer")
            .select(["id", "name", "serverUrl", "scopes", "isActive", "connectedAt"])
            .where("tenantId", "=", org.id)
            .orderBy("name")
            .execute();
        });

        return {
          builtInUrl: `${mcpBaseUrl}/${org.namespace}`,
          externalServers,
        };
      },
      { auth: true },
    ),
);
