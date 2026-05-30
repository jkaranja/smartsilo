import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const orgs = await locals.db
    .selectFrom('Organization')
    .leftJoin('OrganizationMembership', 'OrganizationMembership.organizationId', 'Organization.id')
    .leftJoin('Subscription', 'Subscription.organizationId', 'Organization.id')
    .select(({ fn }) => [
      'Organization.id',
      'Organization.name',
      'Organization.domain',
      'Organization.industry',
      'Organization.createdAt',
      'Subscription.plan',
      'Subscription.status',
      fn.count('OrganizationMembership.id').as('memberCount'),
    ])
    .groupBy(['Organization.id', 'Subscription.plan', 'Subscription.status'])
    .orderBy('Organization.createdAt', 'desc')
    .execute();

  return { orgs };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const data         = await request.formData();
    const name         = data.get('name')         as string;
    const domain       = data.get('domain')       as string;
    const industry     = data.get('industry')     as string;
    const plan         = (data.get('plan') ?? 'STARTER') as string;
    const mcpServerUrl = data.get('mcpServerUrl') as string;

    if (!name || !domain || !industry || !mcpServerUrl) {
      return fail(400, { error: 'All fields are required' });
    }

    const existing = await locals.db
      .selectFrom('Organization')
      .select('id')
      .where('domain', '=', domain)
      .executeTakeFirst();

    if (existing) {
      return fail(409, { error: 'Domain already taken' });
    }

    const orgId = crypto.randomUUID();

    await locals.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('Organization')
        .values({
          id:        orgId,
          name,
          domain,
          industry:  industry as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();

      await trx
        .insertInto('Subscription')
        .values({
          id:             crypto.randomUUID(),
          organizationId: orgId,
          plan:           plan as any,
          status:         'TRIALING',
          createdAt:      new Date(),
          updatedAt:      new Date(),
        })
        .execute();

      await trx
        .insertInto('McpServer')
        .values({
          id:             crypto.randomUUID(),
          organizationId: orgId,
          type:           'INTERNAL',
          name:           `${name} Copilot`,
          serverUrl:      mcpServerUrl,
          isActive:       true,
          connectedAt:    new Date(),
          updatedAt:      new Date(),
        })
        .execute();
    });
  },
};
