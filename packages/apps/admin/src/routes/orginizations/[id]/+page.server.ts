import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const org = await locals.db
    .selectFrom('Organization')
    .selectAll()
    .where('id', '=', params.id)
    .executeTakeFirst();

  if (!org) error(404, 'Organisation not found');

  const invitations = await locals.db
    .selectFrom('OrganizationInvitation')
    .selectAll()
    .where('organizationId', '=', params.id)
    .orderBy('createdAt', 'desc')
    .execute();

  return { org, invitations };
};

export const actions: Actions = {
  invite: async ({ request, params, locals }) => {
    const data  = await request.formData();
    const email = data.get('email') as string;
    const name  = data.get('name')  as string;
    const role  = data.get('role')  as string;

    if (!email || !name || !role) {
      return fail(400, { error: 'All fields are required' });
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
      return fail(409, { error: 'A pending invite already exists for this email' });
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
};
