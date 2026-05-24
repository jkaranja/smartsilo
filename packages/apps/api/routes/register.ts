import { t } from "elysia";
import { getAuth } from "@saas/auth";
import { kysely, setRls } from "@saas/db";
import type { Industry, Plan } from "@saas/db";
import { app } from "../server/app";

app

  // POST /api/auth/register — owner self-signup, creates org + user + membership
  .post(
    "/api/auth/register",
    async ({ body, set }) => {
      const auth = getAuth();

      const existing = await kysely
        .selectFrom("Organization")
        .select("id")
        .where("namespace", "=", body.namespace)
        .executeTakeFirst();

      if (existing) {
        set.status = 409;
        return { error: "Namespace already taken" };
      }

      let userId: string;
      try {
        const result = await auth.api.signUpEmail({
          body: { name: body.name, email: body.email, password: body.password },
        });
        userId = (result as any).user.id;
      } catch (e: any) {
        set.status = 400;
        return { error: e.message ?? "Signup failed" };
      }

      const org = await kysely.transaction().execute(async (trx) => {
        const created = await trx
          .insertInto("Organization")
          .values({
            id: crypto.randomUUID(),
            name: body.companyName,
            namespace: body.namespace,
            industry: body.industry.toUpperCase() as Industry,
            plan: "STARTER" as Plan,
            status: "active",
            updatedAt: new Date(),
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await setRls(trx, created.id);

        await trx
          .insertInto("OrganizationMembership")
          .values({
            id: crypto.randomUUID(),
            organizationId: created.id,
            userId,
            role: "OWNER",
            updatedAt: new Date(),
          })
          .execute();

        return created;
      });

      return {
        organizationId: org.id,
        namespace: org.namespace,
        industry: org.industry,
      };
    },
    {
      body: t.Object({
        namespace: t.String({ minLength: 2, maxLength: 48 }),
        companyName: t.String({ minLength: 2 }),
        industry: t.Union([
          t.Literal("garage"),
          t.Literal("clinic"),
          t.Literal("dealership"),
        ]),
        name: t.String({ minLength: 2 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    },
  );
