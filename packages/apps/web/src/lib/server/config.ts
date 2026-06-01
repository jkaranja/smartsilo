import { env } from "$env/dynamic/private";

export interface ServerConfig {
  apiUrl: string;
}

function parse(): ServerConfig {
  if (!env.SERVER_CONFIG) {
    throw new Error("SERVER_CONFIG is not set");
  }

  const config: ServerConfig = JSON.parse(env.SERVER_CONFIG);

  if (!config.apiUrl) {
    throw new Error("SERVER_CONFIG.apiUrl is required");
  }

  return config;
}

export const serverConfig = parse();
