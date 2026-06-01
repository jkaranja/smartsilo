import { t } from "elysia";
import { getAuth } from "@saas/auth";
import { kysely, setRls } from "@saas/db";
import type { OrganizationRole } from "@saas/db";
import { app } from "../../server/app";

app
  .get(
    "/invitations/:id",
    async ({ params, set }) => {
      const invitation = await kysely
        .selectFrom("OrganizationInvitation")
        .innerJoin(
          "Organization",
          "Organization.id",
          "OrganizationInvitation.organizationId",
        )
        .select([
          "OrganizationInvitation.email",
          "OrganizationInvitation.name",
          "OrganizationInvitation.role",
          "OrganizationInvitation.expiresAt",
          "Organization.name as organizationName",
          "Organization.domain",
          "Organization.industry",
        ])
        .where("OrganizationInvitation.id", "=", params.id)
        .where("OrganizationInvitation.acceptedAt", "is", null)
        .where("OrganizationInvitation.expiresAt", ">", new Date())
        .executeTakeFirst();

      if (!invitation) {
        set.status = 404;
        return { error: "Invitation not found or expired" };
      }

      return invitation;
    },
    { params: t.Object({ id: t.String() }) },
  )

  .post(
    "/invitations/:id/accept",
    async ({ params, body, set }) => {
      const auth = getAuth();

      const invitation = await kysely
        .selectFrom("OrganizationInvitation")
        .innerJoin(
          "Organization",
          "Organization.id",
          "OrganizationInvitation.organizationId",
        )
        .select([
          "OrganizationInvitation.id as invitationId",
          "OrganizationInvitation.organizationId",
          "OrganizationInvitation.email",
          "OrganizationInvitation.role",
          "Organization.domain",
        ])
        .where("OrganizationInvitation.id", "=", params.id)
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
          body: {
            name: body.name,
            email: invitation.email,
            password: body.password,
          },
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
        body: { email: invitation.email, password: body.password },
      });

      return {
        token: (session as any).token,
        redirectTo: `/${invitation.domain}`,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 2 }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )

  .post(
    "/invitations/:id/decline",
    async ({ params, set }) => {
      const updated = await kysely
        .updateTable("OrganizationInvitation")
        .set({ expiresAt: new Date() })
        .where("id", "=", params.id)
        .where("acceptedAt", "is", null)
        .executeTakeFirst();

      if (!updated.numUpdatedRows) {
        set.status = 404;
        return { error: "Invitation not found or already actioned" };
      }

      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
