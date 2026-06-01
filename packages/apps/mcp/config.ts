import { Auth } from "@saas/auth";
import { DB } from "@saas/db";

export interface McpConfig {
  host: string;
  authServerUrl: string;
  dbUrl: string;
  allowedOrigins: string[];
  services: {
    betterAuth: {
      secret: string;
    };
  };
}

let mcpConfig: McpConfig | undefined;

export const configureMcp = (config: McpConfig) => {
  if (!config.host) {
    throw new Error("McpConfig.host is required");
  }

  if (!config.authServerUrl) {
    throw new Error("McpConfig.authServerUrl is required");
  }

  if (!config.dbUrl) {
    throw new Error("McpConfig.dbUrl is required");
  }

  if (!config.services.betterAuth?.secret) {
    throw new Error("McpConfig.services.betterAuth.secret is required");
  }

  DB.configureDB({ connectionString: config.dbUrl });

  Auth.configureAuth({
    betterAuth: {
      secret: config.services.betterAuth.secret,
      baseURL: config.authServerUrl,
    },
  });

  mcpConfig = config;
};

export const getMcpConfig = () => {
  if (!mcpConfig) {
    throw new Error("McpConfig is not initialized");
  }
  return mcpConfig;
};
