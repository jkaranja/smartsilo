import { Elysia } from "elysia";
import { setRls } from "@saas/db";
import { Industry } from "@saas/db/types";
import { requirePermission } from "@saas/auth";
import { contextPlugin } from "../../server";
import { garage } from "@saas/extensions";

export const garageRouter = new Elysia({ name: "garage-router" })
  .use(contextPlugin)
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
            return garage.services.inventory.parts.list(trx, {});
          });
        },
        { query: garage.lib.services.inventory.parts.ListSchema },
      )

      .get(
        "/inventory/parts/:sku",
        async ({ user, db, params }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
          requirePermission(org.role.toLowerCase() as any, "inventory:read");
          return db.transaction().execute(async (trx) => {
            await setRls(trx, org.id);
            return garage.services.inventory.parts.getBySku(trx, {
              sku: params.sku,
            });
          });
        },
      )

      .get(
        "/orders/work-orders",
        async ({ user, db, query }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
          requirePermission(org.role.toLowerCase() as any, "work_orders:read");
          return db.transaction().execute(async (trx) => {
            await setRls(trx, org.id);
            return garage.services.orders.workOrders.list(trx, query);
          });
        },
        { query: garage.lib.services.orders.workOrders.ListSchema },
      )

      .post(
        "/orders/work-orders",
        async ({ user, db, body }) => {
          const org = user?.organizations?.[0];
          if (!org) throw new Error("No organization");
          requirePermission(org.role.toLowerCase() as any, "work_orders:write");

          return db.transaction().execute(async (trx) => {
            await setRls(trx, org.id);
            return garage.services.orders.workOrders.create(trx, body);
          });
        },
        { body: garage.lib.services.orders.workOrders.CreateSchema },
      ),
  );
