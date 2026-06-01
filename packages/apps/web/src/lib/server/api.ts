import { createClient } from "@saas/api/client";
import { serverConfig } from "./config";

export const api = createClient(serverConfig.apiUrl);
