import { Auth } from "@saas/auth";
import { DB } from "@saas/db";
import { LLM } from "@saas/llm";
import { type AgentAppConfig, configureAgentApp } from "./config";

export const initServices = () => {
  if (!process.env.AGENT_CONFIG) {
    throw new Error("AGENT_CONFIG is not set");
  }

  const config: AgentAppConfig = JSON.parse(process.env.AGENT_CONFIG);

  configureAgentApp(config);

  DB.initDB();
  Auth.initAuth();
  LLM.initLLM();
  // Agent.initAgent() — skipped: we use Agent.createAgent() per WebSocket connection, not a singleton
};
