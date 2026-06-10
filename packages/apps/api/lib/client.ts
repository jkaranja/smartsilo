import { treaty } from "@elysiajs/eden";
import type { App } from "../server/app";

export const createClient = (url: string) => treaty<App>(`${url}/api`);

export type ApiClient = ReturnType<typeof createClient>;
