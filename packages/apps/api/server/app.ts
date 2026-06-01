import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { getAuth } from "@saas/auth";
import { logger } from "@saas/logger";
import { authPlugin } from "./auth-plugin";
import { initServices } from "../init";
import { getApiConfig } from "../config";
import "../routes/common/invitations";

initServices();

const config = getApiConfig();
const auth = getAuth();

export const app = new Elysia()
  .use(cors({ credentials: true, origin: config.allowedOrigins }))
  .trace(async ({ onHandle }) => {
    onHandle(({ begin, onStop }) => {
      onStop(({ end }) => logger.info("handle took", end - begin, "ms"));
    });
  })
  .mount("/auth", auth.handler)
  .use(authPlugin);

export type App = typeof app;
