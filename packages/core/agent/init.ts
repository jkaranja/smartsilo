import { Agent } from "./agent";
import type { AgentConfig } from "./agent";

let agentConfig: AgentConfig | undefined;

export const configureAgent = (config: AgentConfig) => {
  if (!config.model) {
    throw new Error("AgentConfig.model is required");
  }

  agentConfig = config;
};

export const getAgentConfig = (): AgentConfig => {
  if (!agentConfig) {
    throw new Error("Agent is not configured. Call configureAgent() first.");
  }

  return agentConfig;
};

export let agent: Agent;

export const initAgent = () => {
  agent = new Agent(getAgentConfig());
};

// Creates a fresh Agent instance per caller rather than reusing the singleton.
// Unlike stateless singletons (e.g. db is just a connection pool — every query is independent),
// Agent is stateful: capabilities() writes to this.connections and run() reads from it.
// Two callers sharing one instance means one capabilities() call overwrites the other's tool list mid-run.
export const createAgent = () => new Agent(getAgentConfig());
