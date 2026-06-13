import { env } from "$env/dynamic/public";

export interface PublicWebConfig {
  host: string;
  apiUrl: string;
  mcpUrl: string;
}

function parse(): PublicWebConfig {
  if (!env.PUBLIC_WEB_CONFIG) {
    throw new Error("PUBLIC_WEB_CONFIG is not set");
  }

  const config: PublicWebConfig = JSON.parse(env.PUBLIC_WEB_CONFIG);

  if (!config.host) {
    throw new Error("PUBLIC_WEB_CONFIG.host is required");
  }

  if (!config.apiUrl) {
    throw new Error("PUBLIC_WEB_CONFIG.apiUrl is required");
  }

  return config;
}

export const publicWebConfig = parse();
