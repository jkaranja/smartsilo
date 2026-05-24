import { type PoolConfig } from "pg";
import pg from "pg";
import { Kysely, PostgresDialect } from "kysely";
import type { DB, KyselyClient } from "./types";

export type DbConfig = PoolConfig;

export const db = (config: DbConfig): KyselyClient => {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        ...config,
        options: config.options ?? "-c TimeZone=UTC",
      }),
    }),
  });
};
