import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { adminConfig } from './config';
import pg from 'pg';

export const auth = betterAuth({
  database: new pg.Pool({ connectionString: adminConfig.controlPlaneDatabaseUrl }),

  user:         { modelName: 'AdminUser' },
  session:      { modelName: 'AdminSession' },
  account:      { modelName: 'AdminAccount' },
  verification: { modelName: 'AdminVerification' },

  secret: adminConfig.betterAuth.secret,
  baseURL: adminConfig.betterAuth.baseUrl,

  emailAndPassword: {
    enabled:       true,
    disableSignUp: true,
  },

  advanced: {
    database: { generateId: 'uuid' },
  },

  plugins: [sveltekitCookies(getRequestEvent)],
});
