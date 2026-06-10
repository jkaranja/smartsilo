import { Elysia, t } from "elysia";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import { contextPlugin } from "../../server";

const fetchTools = async (serverUrl: string, authToken?: string) => {
  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(serverUrl),
      
      authToken
        ? { requestInit: { headers: { Authorization: `Bearer ${authToken}` } } }
        : undefined,
    );

    const client = new Client({ name: "smartsilo-api", version: "1.0.0" });

    await client.connect(transport);

    const { tools } = await client.listTools();

    await client.close();

    return tools;
  } catch {
    return null;
  }
};

export const mcpServersRouter = new Elysia({ name: "mcp-servers-router" })
  .use(contextPlugin)

  .get("/mcp", async ({ user, db }) => {
    if (!user?.organizations?.length) throw new Error("No organization found");
    const org = user.organizations[0]!;
    requirePermission(org.role.toLowerCase() as any, "integrations:read");

    return db.transaction().execute(async (trx) => {
      await setRls(trx, org.id);
      return trx
        .selectFrom("McpServer")
        .select([
          "id",
          "name",
          "serverUrl",
          "isActive",
          "connectedAt",
          "scopes",
          "tokenExpiresAt",
          "tools",
        ])
        .where("organizationId", "=", org.id)
        .where("type", "=", "EXTERNAL")
        .orderBy("name")
        .execute();
    });
  })

  .post(
    "/mcp",
    async ({ body, user, db }) => {
      if (!user?.organizations?.length)
        throw new Error("No organization found");

      const org = user.organizations[0]!;

      requirePermission(org.role.toLowerCase() as any, "integrations:manage");

      const tools = await fetchTools(body.serverUrl, body.authToken);

      const server = await db.transaction().execute(async (trx) => {
        await setRls(trx, org.id);
        return trx
          .insertInto("McpServer")
          .values({
            id: crypto.randomUUID(),
            name: body.name,
            serverUrl: body.serverUrl,
            authToken: body.authToken ?? null,
            scopes: body.scopes ?? [],
            isActive: true,
            type: "EXTERNAL",
            organizationId: org.id,
            addedById: user.id,
            connectedAt: new Date(),
            updatedAt: new Date(),
            tools: tools as any,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      });

      return {
        message: `${body.name} added`,
        id: server.id,
        toolCount: tools?.length ?? 0,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        serverUrl: t.String(),
        authToken: t.Optional(t.String()),
        scopes: t.Optional(t.Array(t.String())),
      }),
    },
  )

  .delete("/mcp/:id", async ({ params, user, db }) => {
    if (!user?.organizations?.length) throw new Error("No organization found");
    const org = user.organizations[0]!;
    requirePermission(org.role.toLowerCase() as any, "integrations:manage");

    await db.transaction().execute(async (trx) => {
      await setRls(trx, org.id);
      await trx
        .deleteFrom("McpServer")
        .where("id", "=", params.id)
        .where("organizationId", "=", org.id)
        .where("type", "=", "EXTERNAL")
        .execute();
    });

    return { message: "Server removed" };
  });
