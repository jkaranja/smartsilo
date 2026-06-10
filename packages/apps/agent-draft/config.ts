import { Auth } from "@saas/auth";
import { DB } from "@saas/db";
import { Agent } from "@saas/agent";
import { LLM } from "@saas/llm";

export interface AgentAppConfig {
  dbUrl: string;
  host: string;
  allowedOrigins: string[];
  services: {
    anthropic: {
      key: string;
    };
    betterAuth: {
      secret: string;
    };
  };
}

let agentAppConfig: AgentAppConfig | undefined;

export const configureAgentApp = (config: AgentAppConfig) => {
  if (!config.dbUrl) {
    throw new Error("AgentAppConfig.dbUrl is required");
  }

  if (!config.host) {
    throw new Error("AgentAppConfig.host is required");
  }

  if (!config.allowedOrigins?.length) {
    throw new Error("AgentAppConfig.allowedOrigins is required");
  }

  if (!config.services.anthropic?.key) {
    throw new Error("AgentAppConfig.services.anthropic.key is required");
  }

  if (!config.services.betterAuth?.secret) {
    throw new Error("AgentAppConfig.services.betterAuth.secret is required");
  }

  DB.configureDB({ connectionString: config.dbUrl });

  Auth.configureAuth({
    betterAuth: {
      secret: config.services.betterAuth.secret,
      baseURL: config.host,
    },
  });

  Agent.configureAgent({
    model: "claude-sonnet-4-6",
    apiKey: config.services.anthropic.key,
  });

  LLM.configureLLM({ anthropicApiKey: config.services.anthropic.key });

  agentAppConfig = config;
};

export const getAgentAppConfig = (): AgentAppConfig => {
  if (!agentAppConfig) {
    throw new Error(
      "AgentApp is not configured. Call configureAgentApp() first.",
    );
  }

  return agentAppConfig;
};
