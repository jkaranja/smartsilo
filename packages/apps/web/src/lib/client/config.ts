import { env } from "$env/dynamic/public";

export interface ClientConfig {
  host: string;
}

function parse(): ClientConfig {
  if (!env.PUBLIC_CLIENT_CONFIG) {
    throw new Error("PUBLIC_CLIENT_CONFIG is not set");
  }

  const config: ClientConfig = JSON.parse(env.PUBLIC_CLIENT_CONFIG);

  if (!config.host) {
    throw new Error("PUBLIC_CLIENT_CONFIG.host is required");
  }

  return config;
}

export const clientConfig = parse();
