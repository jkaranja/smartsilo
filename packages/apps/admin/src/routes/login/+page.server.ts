import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(302, '/');
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data     = await request.formData();
    const email    = data.get('email')    as string;
    const password = data.get('password') as string;

    try {
      await auth.api.signInEmail({ body: { email, password } });
    } catch {
      return fail(401, { error: 'Invalid email or password' });
    }

    redirect(302, '/');
  },
};
