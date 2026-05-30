import { t } from "elysia";
import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import type { OrganizationRole } from "@saas/db";
import { sendInviteEmail } from "@saas/comm";
import { app } from "../../server/app";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://platform.com";

app.group("/api/users", (app) =>
  app
    // GET /api/users — list all members of this organization
    .get(
      "/",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:read");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .selectFrom("OrganizationMembership")
            .innerJoin("User", "User.id", "OrganizationMembership.userId")
            .select([
              "User.id",
              "User.email",
              "User.name",
              "OrganizationMembership.role",
              "OrganizationMembership.createdAt",
            ])
            .where("OrganizationMembership.organizationId", "=", org.id)
            .orderBy("User.name")
            .execute();
        });
      },
      { auth: true },
    )

    // GET /api/users/invitations — list pending invitations
    .get(
      "/invitations",
      async ({ user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:read");

        return db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .selectFrom("OrganizationInvitation")
            .select(["id", "email", "name", "role", "expiresAt", "createdAt"])
            .where("organizationId", "=", org.id)
            .where("acceptedAt", "is", null)
            .where("expiresAt", ">", new Date())
            .orderBy("createdAt", "desc")
            .execute();
        });
      },
      { auth: true },
    )

    // POST /api/users/invitations — invite a new member
    .post(
      "/invitations",
      async ({ body, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:invite");

        const { email, name, role: staffRole } = body;

        const alreadyMember = await db
          .selectFrom("User")
          .innerJoin(
            "OrganizationMembership",
            "OrganizationMembership.userId",
            "User.id",
          )
          .select("User.id")
          .where("User.email", "=", email)
          .where("OrganizationMembership.organizationId", "=", org.id)
          .executeTakeFirst();

        if (alreadyMember) {
          set.status = 409;
          return { error: "User is already a member of this organization" };
        }

        const existingInvitation = await db
          .selectFrom("OrganizationInvitation")
          .select("id")
          .where("organizationId", "=", org.id)
          .where("email", "=", email)
          .where("acceptedAt", "is", null)
          .where("expiresAt", ">", new Date())
          .executeTakeFirst();

        if (existingInvitation) {
          set.status = 409;
          return {
            error: "A pending invitation already exists for this email",
          };
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          await trx
            .insertInto("OrganizationInvitation")
            .values({
              id: crypto.randomUUID(),
              organizationId: org.id,
              email,
              name,
              role: staffRole as OrganizationRole,
              token,
              invitedById: user.id,
              expiresAt,
            })
            .execute();
        });

        const inviteUrl = `${PLATFORM_URL}/accept-invitation?token=${token}`;
        await sendInviteEmail({
          email,
          inviteUrl,
          tenantSlug: org.namespace,
          role: staffRole,
        });

        return { message: `Invitation sent to ${email}`, expiresAt };
      },
      {
        auth: true,
        body: t.Object({
          email: t.String({ format: "email" }),
          name: t.String({ minLength: 1 }),
          role: t.String(),
        }),
      },
    )

    // POST /api/users/invitations/:id/resend — extend and resend
    .post(
      "/invitations/:id/resend",
      async ({ params, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:invite");

        const invitation = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .updateTable("OrganizationInvitation")
            .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
            .where("id", "=", params.id)
            .where("organizationId", "=", org.id)
            .where("acceptedAt", "is", null)
            .returningAll()
            .executeTakeFirst();
        });

        if (!invitation) {
          set.status = 404;
          return { error: "Invitation not found or already accepted" };
        }

        const inviteUrl = `${PLATFORM_URL}/accept-invitation?token=${invitation.token}`;
        await sendInviteEmail({
          email: invitation.email,
          inviteUrl,
          tenantSlug: org.namespace,
          role: invitation.role,
        });

        return { message: `Invitation resent to ${invitation.email}` };
      },
      { auth: true },
    )

    // DELETE /api/users/invitations/:id — revoke a pending invitation
    .delete(
      "/invitations/:id",
      async ({ params, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:invite");

        const deleted = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .deleteFrom("OrganizationInvitation")
            .where("id", "=", params.id)
            .where("organizationId", "=", org.id)
            .where("acceptedAt", "is", null)
            .returningAll()
            .executeTakeFirst();
        });

        if (!deleted) {
          set.status = 404;
          return { error: "Invitation not found or already accepted" };
        }

        return { message: "Invitation revoked" };
      },
      { auth: true },
    )

    // PATCH /api/users/:id/role — change a member's role
    .patch(
      "/:id/role",
      async ({ params, body, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:manage");

        const updated = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .updateTable("OrganizationMembership")
            .set({ role: body.role as OrganizationRole })
            .where("userId", "=", params.id)
            .where("organizationId", "=", org.id)
            .returningAll()
            .executeTakeFirst();
        });

        if (!updated) {
          set.status = 404;
          return { error: "Member not found" };
        }

        return { message: "Role updated" };
      },
      {
        auth: true,
        body: t.Object({ role: t.String() }),
      },
    )

    // DELETE /api/users/:id — remove a member
    .delete(
      "/:id",
      async ({ params, user, db, set }) => {
        if (!user?.organizations?.length) {
          set.status = 403;
          return { error: "No organization found" };
        }
        const org = user.organizations[0]!;
        requirePermission(org.role.toLowerCase() as any, "users:manage");

        if (params.id === user.id) {
          set.status = 400;
          return { error: "You cannot remove yourself" };
        }

        const deleted = await db.transaction().execute(async (trx) => {
          await setRls(trx, org.id);
          return trx
            .deleteFrom("OrganizationMembership")
            .where("userId", "=", params.id)
            .where("organizationId", "=", org.id)
            .returningAll()
            .executeTakeFirst();
        });

        if (!deleted) {
          set.status = 404;
          return { error: "Member not found" };
        }

        return { message: "Member removed" };
      },
      { auth: true },
    ),
);
