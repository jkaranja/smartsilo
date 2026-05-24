import { env } from '$env/dynamic/public';

export interface PublicAdminConfig {
  appUrl: string;
}

function parse(): PublicAdminConfig {
  if (!env.PUBLIC_ADMIN_CONFIG) {
    throw new Error('PUBLIC_ADMIN_CONFIG is not set');
  }

  return JSON.parse(env.PUBLIC_ADMIN_CONFIG);
}

export const publicConfig = parse();
