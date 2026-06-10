import { webConfig } from "./config";

export const getAuthSession = async (headers: Headers) => {
  try {
    const res = await fetch(`${webConfig.apiUrl}/auth/session`, { headers });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};
