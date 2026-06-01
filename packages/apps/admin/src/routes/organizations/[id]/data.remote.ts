import { query, command, getRequestEvent } from "$app/server";
import * as v from "valibot";

export const getMcpServers = query(async () => {
  const { locals, params } = getRequestEvent();

  return locals.db
    .selectFrom("McpServer")
    .select(["id", "name", "serverUrl", "type", "isActive", "connectedAt"])
    .where("organizationId", "=", params.id!)
    .orderBy("connectedAt", "asc")
    .execute();
});

const AddMcpServerSchema = v.object({
  name: v.string(),
  serverUrl: v.string(),
  authToken: v.optional(v.string()),
});

export const addMcpServer = command(AddMcpServerSchema, async (input) => {
  const { locals, params } = getRequestEvent();

  await locals.db
    .insertInto("McpServer")
    .values({
      id: crypto.randomUUID(),
      organizationId: params.id!,
      type: "EXTERNAL",
      name: input.name,
      serverUrl: input.serverUrl,
      authToken: input.authToken ?? null,
      isActive: true,
      addedById: locals.user!.id,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  await getMcpServers().refresh();
});

export const getSubscription = query(async () => {
  const { locals, params } = getRequestEvent();

  return locals.db
    .selectFrom("Subscription")
    .select(["id", "plan", "status", "createdAt", "updatedAt"])
    .where("organizationId", "=", params.id!)
    .executeTakeFirst();
});

const UpsertSubscriptionSchema = v.object({
  plan: v.picklist(["STARTER", "PRO", "ENTERPRISE"]),
  status: v.picklist(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "PAUSED"]),
});

export const upsertSubscription = command(
  UpsertSubscriptionSchema,
  async (input) => {
    const { locals, params } = getRequestEvent();

    const existing = await locals.db
      .selectFrom("Subscription")
      .select("id")
      .where("organizationId", "=", params.id!)
      .executeTakeFirst();

    if (existing) {
      await locals.db
        .updateTable("Subscription")
        .set({ plan: input.plan, status: input.status, updatedAt: new Date() })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await locals.db
        .insertInto("Subscription")
        .values({
          id: crypto.randomUUID(),
          organizationId: params.id!,
          plan: input.plan,
          status: input.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
    }

    await getSubscription().refresh();
  },
);

export const getInvitations = query(async () => {
  const { locals, params } = getRequestEvent();

  return locals.db
    .selectFrom('OrganizationInvitation')
    .selectAll()
    .where('organizationId', '=', params.id!)
    .orderBy('createdAt', 'desc')
    .execute();
});

const InviteMemberSchema = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  role: v.picklist(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']),
});

export const inviteMember = command(InviteMemberSchema, async (input) => {
  const { locals, params } = getRequestEvent();

  const pending = await locals.db
    .selectFrom('OrganizationInvitation')
    .select('id')
    .where('organizationId', '=', params.id!)
    .where('email', '=', input.email)
    .where('acceptedAt', 'is', null)
    .where('expiresAt', '>', new Date())
    .executeTakeFirst();

  if (pending) {
    throw new Error('A pending invite already exists for this email');
  }

  await locals.db
    .insertInto('OrganizationInvitation')
    .values({
      id:             crypto.randomUUID(),
      email:          input.email,
      name:           input.name,
      role:           input.role,
      token:          crypto.randomUUID(),
      organizationId: params.id!,
      expiresAt:      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt:      new Date(),
    })
    .execute();

  await getInvitations().refresh();
});

const ToggleMcpSchema = v.object({
  id: v.string(),
  isActive: v.boolean(),
});

export const toggleMcpServer = command(ToggleMcpSchema, async (input) => {
  const { locals } = getRequestEvent();

  await locals.db
    .updateTable('McpServer')
    .set({ isActive: !input.isActive, updatedAt: new Date() })
    .where('id', '=', input.id)
    .execute();

  await getMcpServers().refresh();
});

const DeleteMcpSchema = v.object({
  id: v.string(),
});

export const deleteMcpServer = command(DeleteMcpSchema, async (input) => {
  const { locals } = getRequestEvent();

  const server = await locals.db
    .selectFrom('McpServer')
    .select('type')
    .where('id', '=', input.id)
    .executeTakeFirst();

  if (server?.type === 'INTERNAL') {
    throw new Error('Cannot delete the internal MCP server');
  }

  await locals.db
    .deleteFrom('McpServer')
    .where('id', '=', input.id)
    .execute();

  await getMcpServers().refresh();
});

const DeleteInvitationSchema = v.object({
  id: v.string(),
});

export const deleteInvitation = command(DeleteInvitationSchema, async (input) => {
  const { locals } = getRequestEvent();

  await locals.db
    .deleteFrom('OrganizationInvitation')
    .where('id', '=', input.id)
    .execute();

  await getInvitations().refresh();
});

const DeleteSubscriptionSchema = v.object({
  id: v.string(),
});

export const deleteSubscription = command(DeleteSubscriptionSchema, async (input) => {
  const { locals } = getRequestEvent();

  await locals.db
    .deleteFrom('Subscription')
    .where('id', '=', input.id)
    .execute();

  await getSubscription().refresh();
});
