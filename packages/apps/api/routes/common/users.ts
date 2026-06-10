import { Elysia, t } from "elysia";
import { requirePermission } from "@saas/auth";
import { setRls } from "@saas/db";
import type { OrganizationRole } from "@saas/db";
import { sendInviteEmail } from "@saas/comm";
import { contextPlugin } from "../../server";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://platform.com";

export const usersRouter = new Elysia({ name: "users-router" })
  .use(contextPlugin)
  .group("/users", (app) =>
    app
      .get(
        "/",
        async ({ user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
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
        
      )

      .get(
        "/invitations",
        async ({ user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
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
        
      )

      .post(
        "/invitations",
        async ({ body, user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
          const org = user.organizations[0]!;
          requirePermission(org.role.toLowerCase() as any, "users:invite");

          const { email, name, role: staffRole } = body;

          const alreadyMember = await db
            .selectFrom("User")
            .innerJoin("OrganizationMembership", "OrganizationMembership.userId", "User.id")
            .select("User.id")
            .where("User.email", "=", email)
            .where("OrganizationMembership.organizationId", "=", org.id)
            .executeTakeFirst();

          if (alreadyMember) throw new Error("User is already a member of this organization");

          const existingInvitation = await db
            .selectFrom("OrganizationInvitation")
            .select("id")
            .where("organizationId", "=", org.id)
            .where("email", "=", email)
            .where("acceptedAt", "is", null)
            .where("expiresAt", ">", new Date())
            .executeTakeFirst();

          if (existingInvitation) throw new Error("A pending invitation already exists for this email");

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
                expiresAt,
              })
              .execute();
          });

          const inviteUrl = `${PLATFORM_URL}/invitations/${token}`;
          await sendInviteEmail({ email, inviteUrl, tenantSlug: org.domain, role: staffRole });

          return { message: `Invitation sent to ${email}`, expiresAt };
        },
        {
          
          body: t.Object({
            email: t.String({ format: "email" }),
            name: t.String({ minLength: 1 }),
            role: t.String(),
          }),
        },
      )

      .post(
        "/invitations/:id/resend",
        async ({ params, user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
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

          if (!invitation) throw new Error("Invitation not found or already accepted");

          const inviteUrl = `${PLATFORM_URL}/invitations/${invitation.id}`;
          await sendInviteEmail({ email: invitation.email, inviteUrl, tenantSlug: org.domain, role: invitation.role });

          return { message: `Invitation resent to ${invitation.email}` };
        },
        
      )

      .delete(
        "/invitations/:id",
        async ({ params, user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
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

          if (!deleted) throw new Error("Invitation not found or already accepted");

          return { message: "Invitation revoked" };
        },
        
      )

      .patch(
        "/:id/role",
        async ({ params, body, user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
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

          if (!updated) throw new Error("Member not found");

          return { message: "Role updated" };
        },
        {
          
          body: t.Object({ role: t.String() }),
        },
      )

      .delete(
        "/:id",
        async ({ params, user, db }) => {
          if (!user?.organizations?.length) throw new Error("No organization found");
          const org = user.organizations[0]!;
          requirePermission(org.role.toLowerCase() as any, "users:manage");

          if (params.id === user.id) throw new Error("You cannot remove yourself");

          const deleted = await db.transaction().execute(async (trx) => {
            await setRls(trx, org.id);
            return trx
              .deleteFrom("OrganizationMembership")
              .where("userId", "=", params.id)
              .where("organizationId", "=", org.id)
              .returningAll()
              .executeTakeFirst();
          });

          if (!deleted) throw new Error("Member not found");

          return { message: "Member removed" };
        },
        
      ),
  );
