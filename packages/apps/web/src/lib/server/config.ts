import { env } from "$env/dynamic/private";

export interface WebConfig {
  apiUrl: string;
}

function parse(): WebConfig {
  if (!env.WEB_CONFIG) {
    throw new Error("WEB_CONFIG is not set");
  }

  const config: WebConfig = JSON.parse(env.WEB_CONFIG);

  if (!config.apiUrl) {
    throw new Error("WEB_CONFIG.apiUrl is required");
  }

  return config;
}

export const webConfig = parse();
