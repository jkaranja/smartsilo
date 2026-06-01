import { env } from "$env/dynamic/private";

export interface AdminConfig {
  host: string;
  databaseUrl: string;
  managedDatabaseUrl: string;
  betterAuth: {
    secret: string;
  };
}

function parse(): AdminConfig {
  if (!env.ADMIN_CONFIG) {
    throw new Error("ADMIN_CONFIG is not set");
  }

  const config: AdminConfig = JSON.parse(env.ADMIN_CONFIG);

  if (!config.host) {
    throw new Error("ADMIN_CONFIG.host is required");
  }

  if (!config.databaseUrl) {
    throw new Error("ADMIN_CONFIG.databaseUrl is required");
  }

  if (!config.managedDatabaseUrl) {
    throw new Error("ADMIN_CONFIG.managedDatabaseUrl is required");
  }

  if (!config.betterAuth?.secret) {
    throw new Error("ADMIN_CONFIG.betterAuth.secret is required");
  }

  return config;
}

export const adminConfig = parse();
