import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { oauthProvider } from "@better-auth/oauth-provider";
import { sso } from "@better-auth/sso";
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
  oauth?: {
    loginPage: string;
    consentPage: string;
    allowDynamicClientRegistration?: boolean;
  };
  sso?: {
    defaultRole?: "member" | "admin";
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

    // https://better-auth.com/docs/concepts/email#email-verification

    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
    },

    plugins: [
      //  enables authentication using Bearer tokens as an alternative to browser cookies. It intercepts requests, adding the Bearer token to the Authorization header before forwarding them to your API.
      bearer(), // allows Authorization: Bearer <session-token> on API requests
      jwt(), // issues signed JWTs used by oauthProvider for access tokens
      ...(config.oauth
        ? [
            oauthProvider({
              loginPage: config.oauth.loginPage,
              consentPage: config.oauth.consentPage,
              allowDynamicClientRegistration:
                config.oauth.allowDynamicClientRegistration ?? true,
            }),
          ]
        : []),
      sso({
        organizationProvisioning: {
          enabled: true,
          defaultRole: config.sso?.defaultRole ?? "member",
        },
        provisionUserOnEveryLogin: true,
      }),
    ],

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
