import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const org = await locals.db
    .selectFrom('Organization')
    .leftJoin('Subscription', 'Subscription.organizationId', 'Organization.id')
    .select([
      'Organization.id',
      'Organization.name',
      'Organization.domain',
      'Organization.industry',
      'Organization.createdAt',
      'Subscription.plan',
      'Subscription.status as subscriptionStatus',
    ])
    .where('Organization.id', '=', params.id)
    .executeTakeFirst();

  if (!org) error(404, 'Organisation not found');

  const [invitations, mcpServers] = await Promise.all([
    locals.db
      .selectFrom('OrganizationInvitation')
      .selectAll()
      .where('organizationId', '=', params.id)
      .orderBy('createdAt', 'desc')
      .execute(),

    locals.db
      .selectFrom('McpServer')
      .select(['id', 'name', 'serverUrl', 'type', 'isActive', 'connectedAt', 'addedById'])
      .where('organizationId', '=', params.id)
      .orderBy('connectedAt', 'asc')
      .execute(),
  ]);

  return { org, invitations, mcpServers };
};

export const actions: Actions = {
  invite: async ({ request, params, locals }) => {
    const data  = await request.formData();
    const email = data.get('email') as string;
    const name  = data.get('name')  as string;
    const role  = data.get('role')  as string;

    if (!email || !name || !role) {
      return fail(400, { inviteError: 'All fields are required' });
    }

    const pending = await locals.db
      .selectFrom('OrganizationInvitation')
      .select('id')
      .where('organizationId', '=', params.id)
      .where('email', '=', email)
      .where('acceptedAt', 'is', null)
      .where('expiresAt', '>', new Date())
      .executeTakeFirst();

    if (pending) {
      return fail(409, { inviteError: 'A pending invite already exists for this email' });
    }

    await locals.db
      .insertInto('OrganizationInvitation')
      .values({
        id:             crypto.randomUUID(),
        email,
        name,
        role:           role as any,
        token:          crypto.randomUUID(),
        invitedById:    locals.user!.id,
        organizationId: params.id,
        expiresAt:      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt:      new Date(),
      })
      .execute();
  },

  addMcp: async ({ request, params, locals }) => {
    const data      = await request.formData();
    const name      = data.get('mcpName')      as string;
    const serverUrl = data.get('mcpServerUrl') as string;
    const authToken = data.get('mcpAuthToken') as string | null;

    if (!name || !serverUrl) {
      return fail(400, { mcpError: 'Name and server URL are required' });
    }

    await locals.db
      .insertInto('McpServer')
      .values({
        id:             crypto.randomUUID(),
        organizationId: params.id,
        type:           'EXTERNAL',
        name,
        serverUrl,
        authToken:      authToken || null,
        isActive:       true,
        addedById:      locals.user!.id,
        connectedAt:    new Date(),
        updatedAt:      new Date(),
      })
      .execute();
  },

  toggleMcp: async ({ request, locals }) => {
    const data     = await request.formData();
    const id       = data.get('id')       as string;
    const isActive = data.get('isActive') === 'true';

    await locals.db
      .updateTable('McpServer')
      .set({ isActive: !isActive, updatedAt: new Date() })
      .where('id', '=', id)
      .execute();
  },

  deleteMcp: async ({ request, locals }) => {
    const data = await request.formData();
    const id   = data.get('id') as string;

    const server = await locals.db
      .selectFrom('McpServer')
      .select(['type'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (server?.type === 'INTERNAL') {
      return fail(400, { mcpError: 'Cannot delete the internal MCP server' });
    }

    await locals.db
      .deleteFrom('McpServer')
      .where('id', '=', id)
      .execute();
  },
};
