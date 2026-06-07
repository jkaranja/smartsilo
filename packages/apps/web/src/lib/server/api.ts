import { createClient } from "@saas/api/lib/client";
import { webConfig } from "./config";

export const api = createClient(webConfig.apiUrl);

// export const api = Object.assign(client, {
//   call: async <T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<NonNullable<T>> => {
//     const { data, error } = await fn();
//     if (error) {
//       const v = error.value;
//       const msg =
//         v && typeof v === "object"
//           ? (v.message ?? v.error ?? JSON.stringify(v))
//           : String(v ?? "Request failed");
//       throw new Error(msg);
//     }
//     if (data == null) throw new Error("No data returned");
//     return data;
//   },
// });
