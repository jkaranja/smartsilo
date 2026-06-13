import { query, command, getRequestEvent } from "$app/server";
import * as v from "valibot";

export const getOrganizations = query(async () => {
  const { locals } = getRequestEvent();

  const orgs = await locals.db
    .selectFrom("Organization")
    .leftJoin("Subscription", "Subscription.organizationId", "Organization.id")
    .leftJoin(
      (eb) =>
        eb
          .selectFrom("McpServer")
          .select(["McpServer.organizationId", "McpServer.url"])
          .where("McpServer.type", "=", "INTERNAL")
          .as("InternalMcp"),
      (join) =>
        join.onRef("InternalMcp.organizationId", "=", "Organization.id"),
    )
    .select((eb) => [
      "Organization.id",
      "Organization.name",
      "Organization.domain",
      "Organization.industry",
      "Organization.createdAt",
      "Subscription.plan",
      "Subscription.status",
      "InternalMcp.url as mcpUrl",
      eb
        .selectFrom("OrganizationMembership")
        .whereRef(
          "OrganizationMembership.organizationId",
          "=",
          "Organization.id",
        )
        .select(eb.fn.countAll().as("count"))
        .as("memberCount"),
      eb
        .selectFrom("OrganizationInvitation")
        .whereRef(
          "OrganizationInvitation.organizationId",
          "=",
          "Organization.id",
        )
        .select(eb.fn.countAll().as("count"))
        .as("invitationCount"),
    ])
    .groupBy([
      "Organization.id",
      "Subscription.plan",
      "Subscription.status",
      "InternalMcp.url",
    ])
    .orderBy("Organization.createdAt", "desc")
    .execute();

  return orgs;
});

const CreateOrganizationSchema = v.object({
  name: v.string(),
  domain: v.string(),
  industry: v.picklist(["GARAGE"]),
});

export const createOrganization = command(
  CreateOrganizationSchema,
  async (input) => {
    const { locals } = getRequestEvent();

    const existing = await locals.db
      .selectFrom("Organization")
      .select("id")
      .where("domain", "=", input.domain)
      .executeTakeFirst();

    if (existing) {
      throw new Error("Domain already taken");
    }

    const orgId = crypto.randomUUID();

    await locals.db.transaction().execute(async (trx) => {
      await trx
        .insertInto("Organization")
        .values({
          id: orgId,
          name: input.name,
          domain: input.domain,
          industry: input.industry,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
    });

    await getOrganizations().refresh();
  },
);

const DeleteOrganizationSchema = v.object({
  id: v.string(),
});

export const deleteOrganization = command(
  DeleteOrganizationSchema,
  async (input) => {
    const { locals } = getRequestEvent();

    await locals.db
      .deleteFrom("Organization")
      .where("id", "=", input.id)
      .execute();

    await getOrganizations().refresh();
  },
);
