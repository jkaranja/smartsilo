import { setRls } from "@saas/db";
import { Industry } from "@saas/db/types";
import { requirePermission } from "@saas/auth";
import { app } from "../../server";
import { services, lib } from "@saas/garage";

app.group("/garage", (app) =>
  app
    .onBeforeHandle(({ user, set }: any) => {
      const org = user?.organizations?.[0];

      if (org?.industry !== Industry.GARAGE) {
        set.status = 403;
        return { error: "Access restricted to garage organizations" };
      }
    })

    .get(
      "/inventory/parts",
      async ({ user, db, set }) => {
        const org = user?.organizations?.[0];

        if (!org) {
          set.status = 403;
          return { error: "No organization" };
        }

        requirePermission(org.role.toLowerCase() as any, "inventory:read");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return services.inventory.parts.list(trx, {});
        });
      },
      { auth: true, query: lib.services.inventory.parts.ListSchema },
    )

    .get(
      "/inventory/parts/:sku",
      async ({ user, db, params, set }) => {
        const org = user?.organizations?.[0];
        if (!org) {
          set.status = 403;
          return { error: "No organization" };
        }
        requirePermission(org.role.toLowerCase() as any, "inventory:read");
        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return services.inventory.parts.getBySku(trx, { sku: params.sku });
        });
      },
      { auth: true },
    )

    .get(
      "/jobs/work-orders",
      async ({ user, db, query, set }) => {
        const org = user?.organizations?.[0];
        if (!org) {
          set.status = 403;
          return { error: "No organization" };
        }
        requirePermission(org.role.toLowerCase() as any, "work_orders:read");
        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return services.jobs.workOrders.list(trx, query);
        });
      },
      { auth: true, query: lib.services.jobs.workOrders.ListSchema },
    )

    .post(
      "/jobs/work-orders",
      async ({ user, db, body, set }) => {
        const org = user?.organizations?.[0];
        if (!org) {
          set.status = 403;
          return { error: "No organization" };
        }

        requirePermission(org.role.toLowerCase() as any, "work_orders:write");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return services.jobs.workOrders.create(trx, body);
        });
      },
      { auth: true, body: lib.services.jobs.workOrders.CreateSchema },
    ),
);
