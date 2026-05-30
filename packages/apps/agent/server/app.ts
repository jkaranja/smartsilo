import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { logger } from "@saas/logger";
import { initServices } from "../init";
import { getAgentAppConfig } from "../config";
import { authPlugin } from "./auth-plugin";

initServices();

const config = getAgentAppConfig();

export const app = new Elysia()
  .use(cors({ credentials: true, origin: config.allowedOrigins }))
  .trace(async ({ onHandle }) => {
    onHandle(({ begin, onStop }) => {
      onStop(({ end }) => logger.info("handle took", end - begin, "ms"));
    });
  })
  .use(authPlugin);
