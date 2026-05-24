import { LLM } from "@saas/llm";
import { Auth } from "@saas/auth";
import { DB } from "@saas/db";

export interface ApiConfig {
  host: string;
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
  };
}

let apiConfig: ApiConfig | undefined;

export const configureApi = (config: ApiConfig) => {
  if (!config.host) {
    throw new Error("ApiConfig.host is required");
  }
  if (!config.allowedOrigins?.length) {
    throw new Error("ApiConfig.allowedOrigins is required");
  }
  if (!config.services.betterAuth?.secret) {
    throw new Error("ApiConfig.services.betterAuth.secret is required");
  }

  DB.configureDB({ connectionString: process.env.DATABASE_URL! });

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

  apiConfig = config;
};

export const getApiConfig = () => {
  if (!apiConfig) {
    throw new Error("ApiConfig is not initialized");
  }
  return apiConfig;
};
