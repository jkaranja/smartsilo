import { t } from "elysia";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import { app } from "../../server/app";

app.group("/api/integrations", (app) =>
  app

    // GET /api/integrations/mcp — list connected external MCP servers
    .get(
      "/mcp",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "integrations:read");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .selectFrom("ExternalMcpServer")
            .select(["id", "name", "serverUrl", "isActive", "connectedAt"])
            .where("tenantId", "=", org.id)
            .orderBy("name")
            .execute();
        });
      },
      { auth: true },
    )

    // POST /api/integrations/mcp — connect a new external MCP server
    .post(
      "/mcp",
      async ({ body, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "integrations:manage");

        const { name, serverUrl, authToken, scopes } = body;

        try {
          const transport = new StreamableHTTPClientTransport(
            new URL(serverUrl),
            authToken
              ? {
                  requestInit: {
                    headers: { Authorization: `Bearer ${authToken}` },
                  },
                }
              : undefined,
          );
          const client = new Client(
            { name: "validation-client", version: "1.0.0" },
            {},
          );
          await client.connect(transport);
          await client.listTools();
          await client.close();
        } catch {
          set.status = 422;
          return {
            error: "Could not connect to MCP server. Check the URL and token.",
          };
        }

        const server = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .insertInto("ExternalMcpServer")
            .values({
              id: crypto.randomUUID(),
              tenantId: org.id,
              name,
              serverUrl,
              authToken: authToken ?? null,
              scopes: scopes ?? [],
              isActive: true,
              connectedBy: user.id,
              updatedAt: new Date(),
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        });

        return { message: `${name} connected`, id: server.id };
      },
      {
        auth: true,
        body: t.Object({
          name: t.String(),
          serverUrl: t.String(),
          authToken: t.Optional(t.String()),
          scopes: t.Optional(t.Array(t.String())),
        }),
      },
    )

    // DELETE /api/integrations/mcp/:id — disconnect an external MCP server
    .delete(
      "/mcp/:id",
      async ({ params, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "integrations:manage");

        await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          await trx
            .deleteFrom("ExternalMcpServer")
            .where("id", "=", params.id)
            .where("tenantId", "=", org.id)
            .execute();
        });

        return { message: "Disconnected" };
      },
      { auth: true },
    ),
);
