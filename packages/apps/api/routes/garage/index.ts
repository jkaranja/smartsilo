import { Elysia } from "elysia";
import { setRls } from "@saas/db";
import { Industry } from "@saas/db/types";
import { requirePermission } from "@saas/auth";
import { authPlugin } from "../../server/auth-plugin";
import { services, lib } from "@saas/garage";

export const garageRouter = new Elysia({ name: "garage-router" })
  .use(authPlugin)
  .group("/garage", (app) =>
    app
      .onBeforeHandle(({ user }: any) => {
        const org = user?.organizations?.[0];
        if (org?.industry !== Industry.GARAGE) {
          throw new Error("Access restricted to garage organizations");
        }
      })

      .get(
        "/inventory/parts",
        async ({ user, db }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
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
        async ({ user, db, params }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
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
        async ({ user, db, query }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
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
        async ({ user, db, body }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
          requirePermission(org.role.toLowerCase() as any, "work_orders:write");

          return db.transaction().execute(async (trx) => {
            await setRls(trx, org.id);
            return services.jobs.workOrders.create(trx, body);
          });
        },
        { auth: true, body: lib.services.jobs.workOrders.CreateSchema },
      ),
  );
