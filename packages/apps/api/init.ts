import { LLM } from "@saas/llm";
import { Auth } from "@saas/auth";
import { DB } from "@saas/db";
import { type ApiConfig, configureApi } from "./config";

export const initServices = () => {
  if (!process.env.API_CONFIG) {
    throw new Error("API_CONFIG is not set");
  }

  const config: ApiConfig = JSON.parse(process.env.API_CONFIG);

  configureApi(config);

  DB.initDB();
  Auth.initAuth();
  LLM.initLLM();
};
