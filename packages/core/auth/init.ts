import { type BetterAuthConfig, initBetterAuth } from "./better-auth";

export interface AuthConfig {
  betterAuth: BetterAuthConfig;
}

let authConfig: AuthConfig | undefined;

export const configureAuth = (config: AuthConfig) => {
  if (!config.betterAuth.secret) {
    throw new Error("AuthConfig.betterAuth.secret is required");
  }
  if (!config.betterAuth.baseURL) {
    throw new Error("AuthConfig.betterAuth.baseURL is required");
  }

  authConfig = config;
};

export const getAuthConfig = (): AuthConfig => {
  if (!authConfig) {
    throw new Error("Auth is not configured. Call configureAuth() first.");
  }

  return authConfig;
};

export const initAuth = () => {
  initBetterAuth(getAuthConfig().betterAuth);
};
