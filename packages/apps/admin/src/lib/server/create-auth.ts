import { betterAuth, type BetterAuthOptions } from "better-auth";
import pg from "pg";

interface AuthConfig {
  databaseUrl: string;
  secret: string;
  host: string;
}

export const createAuth = (
  config: AuthConfig,
  plugins: BetterAuthOptions["plugins"] = [],
) =>
  betterAuth({
    database: new pg.Pool({ connectionString: config.databaseUrl }),
    secret: config.secret,
    baseURL: config.host,
    user: { modelName: "User" },
    session: { modelName: "Session" },
    account: { modelName: "Account" },
    verification: { modelName: "Verification" },
    emailAndPassword: { enabled: true },
    advanced: { database: { generateId: "uuid" } },
    plugins,
  });
