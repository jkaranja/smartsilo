import { t } from "elysia";
import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import { app } from "../../server/app";

app.group("/api/settings/sso", (app) =>
  app

    // GET /api/settings/sso — get current SSO config
    .get(
      "/",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "settings:read");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return (
            (await trx
              .selectFrom("SsoConfig")
              .select([
                "id",
                "provider",
                "enabled",
                "domain",
                "clientId",
                "entryPoint",
                "issuer",
                "createdAt",
                "updatedAt",
              ])
              .where("organizationId", "=", org.id)
              .executeTakeFirst()) ?? null
          );
        });
      },
      { auth: true },
    )

    // PUT /api/settings/sso — create or update SSO config
    .put(
      "/",
      async ({ body, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "settings:manage");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);

          const existing = await trx
            .selectFrom("SsoConfig")
            .select("id")
            .where("organizationId", "=", org.id)
            .executeTakeFirst();

          if (existing) {
            return trx
              .updateTable("SsoConfig")
              .set({ ...body, updatedAt: new Date() })
              .where("organizationId", "=", org.id)
              .returningAll()
              .executeTakeFirstOrThrow();
          }

          return trx
            .insertInto("SsoConfig")
            .values({
              id: crypto.randomUUID(),
              organizationId: org.id,
              updatedAt: new Date(),
              ...body,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        });
      },
      {
        auth: true,
        body: t.Object({
          provider: t.Union([
            t.Literal("google"),
            t.Literal("okta"),
            t.Literal("azure"),
          ]),
          enabled: t.Optional(t.Boolean()),
          domain: t.Optional(t.String()),
          clientId: t.Optional(t.String()),
          clientSecret: t.Optional(t.String()),
          entryPoint: t.Optional(t.String()),
          issuer: t.Optional(t.String()),
          certificate: t.Optional(t.String()),
        }),
      },
    )

    // DELETE /api/settings/sso — remove SSO config
    .delete(
      "/",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "settings:manage");

        const deleted = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .deleteFrom("SsoConfig")
            .where("organizationId", "=", org.id)
            .returningAll()
            .executeTakeFirst();
        });

        if (!deleted) {
          set.status = 404;
          return { error: "No SSO configuration found" };
        }

        return { message: "SSO configuration removed" };
      },
      { auth: true },
    ),
);
