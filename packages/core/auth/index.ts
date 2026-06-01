export * as Auth from "./init";

export { getAuthenticatedUser } from "./user";
export type { AuthenticatedUser } from "./user";
export { getAuth } from "./better-auth";
export type { BetterAuthConfig } from "./better-auth";
export { requirePermission, getPermissions } from "./rbac";
export { mcpHandler, verifyAccessToken } from "@better-auth/oauth-provider";
