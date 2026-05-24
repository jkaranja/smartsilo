import { env } from '$env/dynamic/private';

export interface AdminConfig {
  databaseUrl:             string;
  controlPlaneDatabaseUrl: string;
  betterAuth: {
    secret:  string;
    baseUrl: string;
  };
}

function parse(): AdminConfig {
  if (!env.ADMIN_CONFIG) {
    throw new Error('ADMIN_CONFIG is not set');
  }

  const c: AdminConfig = JSON.parse(env.ADMIN_CONFIG);

  if (!c.databaseUrl)             throw new Error('ADMIN_CONFIG.databaseUrl is required');
  if (!c.controlPlaneDatabaseUrl) throw new Error('ADMIN_CONFIG.controlPlaneDatabaseUrl is required');
  if (!c.betterAuth?.secret)      throw new Error('ADMIN_CONFIG.betterAuth.secret is required');
  if (!c.betterAuth?.baseUrl)     throw new Error('ADMIN_CONFIG.betterAuth.baseUrl is required');

  return c;
}

export const adminConfig = parse();
