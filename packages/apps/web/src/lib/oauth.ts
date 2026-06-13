/**
 * Returns true when the current URL represents a Better Auth MCP OAuth authorization redirect.
 * Checks for client_id, redirect_uri, and sig — all three must be present to avoid
 * false positives from unrelated query params.
 */
export const isMcpOAuthFlow = (params: URLSearchParams): boolean =>
  params.has("client_id") && params.has("redirect_uri") && params.has("sig");
