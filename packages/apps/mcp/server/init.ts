import { Auth } from "@saas/auth";
import { DB } from "@saas/db";
import { type McpConfig, configureMcp } from "../config";

export const initServices = () => {
  if (!process.env.MCP_CONFIG) throw new Error("MCP_CONFIG env is not set");

  const config: McpConfig = JSON.parse(process.env.MCP_CONFIG);

  configureMcp(config);

  DB.initDB();
  Auth.initAuth();
};
