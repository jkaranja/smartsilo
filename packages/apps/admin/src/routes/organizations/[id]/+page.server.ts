import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const org = await locals.db
    .selectFrom('Organization')
    .select([
      'Organization.id',
      'Organization.name',
      'Organization.domain',
      'Organization.industry',
      'Organization.createdAt',
    ])
    .where('Organization.id', '=', params.id)
    .executeTakeFirst();

  if (!org) error(404, 'Organisation not found');

  return { org };
};
