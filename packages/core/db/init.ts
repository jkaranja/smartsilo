import type { PoolConfig } from "pg";
import { kyselyClient } from "./clients/kysely";
import type { KyselyClient } from "./types";

export type DbConfig = PoolConfig;

let dbConfig: DbConfig | undefined;

export const configureDB = (config: DbConfig) => {
  if (!config.connectionString) {
    throw new Error("DbConfig.connectionString is required");
  }

  dbConfig = config;
};

export const getDbConfig = (): DbConfig => {
  if (!dbConfig)
    throw new Error("DB is not configured. Call configureDB() first.");

  return dbConfig;
};

export let kysely: KyselyClient;

export const initDB = () => {
  kysely = kyselyClient(getDbConfig());
};
