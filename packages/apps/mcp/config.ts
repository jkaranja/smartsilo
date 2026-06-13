import { Auth } from "@saas/auth";
import { DB } from "@saas/db";

export interface McpConfig {
  host: string;
  webappHost: string;
  databaseUrl: string;
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

  if (!config.webappHost) {
    throw new Error("McpConfig.webappHost is required");
  }

  if (!config.databaseUrl) {
    throw new Error("McpConfig.databaseUrl is required");
  }

  if (!config.services.betterAuth?.secret) {
    throw new Error("McpConfig.services.betterAuth.secret is required");
  }

  DB.configureDB({ connectionString: config.databaseUrl });

  Auth.configureAuth({
    betterAuth: {
      secret: config.services.betterAuth.secret,
      baseURL: config.host,
      basePath: "/",
      trustedOrigins: config.allowedOrigins,
      oauth: {
        loginPage: `${config.webappHost}/sign-in`,
        consentPage: `${config.webappHost}/consent`,
      },
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
