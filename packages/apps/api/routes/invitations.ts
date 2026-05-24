import { t } from "elysia";
import { getAuth } from "@saas/auth";
import { kysely, setRls } from "@saas/db";
import type { OrganizationRole } from "@saas/db";
import { app } from "../server/app";

app

  // GET /accept-invitation?token= — validate token, return invitation details for the UI
  .get(
    "/accept-invitation",
    async ({ query, set }) => {
      const invitation = await kysely
        .selectFrom("OrganizationInvitation")
        .innerJoin("Organization", "Organization.id", "OrganizationInvitation.organizationId")
        .select([
          "OrganizationInvitation.email",
          "OrganizationInvitation.name",
          "OrganizationInvitation.role",
          "OrganizationInvitation.expiresAt",
          "Organization.name as organizationName",
          "Organization.industry",
        ])
        .where("OrganizationInvitation.token", "=", query.token)
        .where("OrganizationInvitation.acceptedAt", "is", null)
        .where("OrganizationInvitation.expiresAt", ">", new Date())
        .executeTakeFirst();

      if (!invitation) {
        set.status = 404;
        return { error: "Invitation not found or expired" };
      }

      return {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        organizationName: invitation.organizationName,
        industry: invitation.industry,
        expiresAt: invitation.expiresAt,
      };
    },
    { query: t.Object({ token: t.String() }) },
  )

  // POST /accept-invitation — invitee completes registration
  .post(
    "/accept-invitation",
    async ({ body, set }) => {
      const { token, name, password } = body;
      const auth = getAuth();

      const invitation = await kysely
        .selectFrom("OrganizationInvitation")
        .innerJoin("Organization", "Organization.id", "OrganizationInvitation.organizationId")
        .select([
          "OrganizationInvitation.id as invitationId",
          "OrganizationInvitation.organizationId",
          "OrganizationInvitation.email",
          "OrganizationInvitation.role",
          "Organization.namespace",
        ])
        .where("OrganizationInvitation.token", "=", token)
        .where("OrganizationInvitation.acceptedAt", "is", null)
        .where("OrganizationInvitation.expiresAt", ">", new Date())
        .executeTakeFirst();

      if (!invitation) {
        set.status = 404;
        return { error: "Invitation not found or expired" };
      }

      let userId: string;

      try {
        const result = await auth.api.signUpEmail({
          body: { name, email: invitation.email, password },
        });
        userId = (result as any).user.id;
      } catch {
        const existing = await kysely
          .selectFrom("User")
          .select("id")
          .where("email", "=", invitation.email)
          .executeTakeFirst();

        if (!existing) {
          set.status = 400;
          return { error: "Signup failed" };
        }
        userId = existing.id;
      }

      await kysely.transaction().execute(async (trx) => {
        await setRls(trx, invitation.organizationId);

        await trx
          .insertInto("OrganizationMembership")
          .values({
            id: crypto.randomUUID(),
            organizationId: invitation.organizationId,
            userId,
            role: invitation.role as OrganizationRole,
            updatedAt: new Date(),
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        await trx
          .updateTable("OrganizationInvitation")
          .set({ acceptedAt: new Date(), repliedById: userId })
          .where("id", "=", invitation.invitationId)
          .execute();
      });

      const session = await auth.api.signInEmail({
        body: { email: invitation.email, password },
      });

      return {
        message: "Account created",
        token: (session as any).token,
        redirectTo: `/${invitation.namespace}/dashboard`,
      };
    },
    {
      body: t.Object({
        token: t.String(),
        name: t.String({ minLength: 2 }),
        password: t.String({ minLength: 8 }),
      }),
    },
  );
