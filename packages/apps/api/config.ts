import { LLM } from "@saas/llm";
import { Mail } from "@saas/comm";
import { Auth } from "@saas/auth";
import { DB } from "@saas/db";
import { Agent } from "@saas/agent";

export interface ApiConfig {
  dbUrl: string;
  host: string;
  mcpBaseUrl: string;
  allowedOrigins: string[];
  services: {
    openai?: {
      key: string;
    };
    anthropic?: {
      key: string;
    };
    betterAuth: {
      secret: string;
      socialProviders?: {
        google?: {
          clientId: string;
          clientSecret: string;
        };
      };
    };
    resend?: {
      apiKey: string;
      fromAddress?: string;
    };
  };
}

let apiConfig: ApiConfig | undefined;

export const configureApi = (config: ApiConfig) => {
  if (!config.host) {
    throw new Error("ApiConfig.host is required");
  }

  if (!config.mcpBaseUrl) {
    throw new Error("ApiConfig.mcpBaseUrl is required");
  }

  if (!config.allowedOrigins?.length) {
    throw new Error("ApiConfig.allowedOrigins is required");
  }

  if (!config.dbUrl) {
    throw new Error("ApiConfig.dbUrl is required");
  }
  if (!config.services.betterAuth?.secret) {
    throw new Error("ApiConfig.services.betterAuth.secret is required");
  }

  DB.configureDB({ connectionString: config.dbUrl });

  Auth.configureAuth({
    betterAuth: {
      secret: config.services.betterAuth.secret,
      baseURL: config.host,
      basePath: "/api",
      trustedOrigins: config.allowedOrigins,
      socialProviders: config.services.betterAuth.socialProviders,
    },
  });

  LLM.configureLLM({
    openaiApiKey: config.services.openai?.key,
    anthropicApiKey: config.services.anthropic?.key,
  });

  if (!config.services.anthropic?.key) {
    throw new Error("ApiConfig.services.anthropic.key is required");
  }

  Agent.configureAgent({
    model: "claude-sonnet-4-6",
    apiKey: config.services.anthropic.key,
  });

  // optional services
  if (config.services.resend) {
    Mail.configureMail({
      resendApiKey: config.services.resend.apiKey,
      fromAddress: config.services.resend.fromAddress,
    });
  }

  apiConfig = config;
};

export const getApiConfig = () => {
  if (!apiConfig) {
    throw new Error("ApiConfig is not initialized");
  }
  return apiConfig;
};
