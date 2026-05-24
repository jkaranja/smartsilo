import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins/bearer";
import { v4 as uuid } from "uuid";
import { DB } from "@saas/db";

export interface BetterAuthConfig {
  secret: string;
  baseURL: string;
  basePath?: string;
  trustedOrigins?: string[];
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
  };
}

export type Auth = ReturnType<typeof betterAuth>;

let authInstance: Auth | undefined;

export const initBetterAuth = (config: BetterAuthConfig) => {
  authInstance = betterAuth({
    database: DB.kysely,
    advanced: {
      database: {
        generateId: () => uuid(),
      },
    },

    user: { modelName: "User" },
    session: { modelName: "Session" },
    account: { modelName: "Account" },
    verification: { modelName: "Verification" },

    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
    },

    plugins: [bearer()],

    baseURL: config.baseURL,
    secret: config.secret,
    ...(config.basePath && { basePath: config.basePath }),
    ...(config.trustedOrigins && { trustedOrigins: config.trustedOrigins }),
    ...(config.socialProviders && { socialProviders: config.socialProviders }),

    databaseHooks: {
      user: {
        create: {
          // SSO auto-provision: fires after Better Auth creates the User row.
          // Look up a pending invite by email → create tenant_membership → mark invite accepted.
          // after: async (baUser) => { ... }
        },
      },
    },
  }) as unknown as Auth;
};

export const getAuth = (): Auth => {
  if (!authInstance) {
    throw new Error("Auth is not initialized. Call initAuth() first.");
  }

  return authInstance;
};
