import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const orgs = await locals.db
    .selectFrom('Organization')
    .leftJoin('OrganizationMembership', 'OrganizationMembership.organizationId', 'Organization.id')
    .select(({ fn }) => [
      'Organization.id',
      'Organization.name',
      'Organization.namespace',
      'Organization.industry',
      'Organization.plan',
      'Organization.status',
      'Organization.createdAt',
      fn.count('OrganizationMembership.id').as('memberCount'),
    ])
    .groupBy('Organization.id')
    .orderBy('Organization.createdAt', 'desc')
    .execute();

  return { orgs };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const data      = await request.formData();
    const name      = data.get('name')      as string;
    const namespace = data.get('namespace') as string;
    const industry  = data.get('industry')  as string;
    const plan      = (data.get('plan') ?? 'STARTER') as string;

    if (!name || !namespace || !industry) {
      return fail(400, { error: 'All fields are required' });
    }

    const existing = await locals.db
      .selectFrom('Organization')
      .select('id')
      .where('namespace', '=', namespace)
      .executeTakeFirst();

    if (existing) {
      return fail(409, { error: 'Namespace already taken' });
    }

    await locals.db
      .insertInto('Organization')
      .values({
        id:        crypto.randomUUID(),
        name,
        namespace,
        industry:  industry as any,
        plan:      plan as any,
        status:    'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
  },
};
