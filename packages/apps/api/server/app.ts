import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { getAuth } from "@saas/auth";
import { logger } from "@saas/logger";
import { authPlugin } from "./auth-plugin";
import { initServices } from "../init";
import { getApiConfig } from "../config";
import { router } from "../routes";

initServices();

const config = getApiConfig();
const auth = getAuth();

export const app = new Elysia()
  .onError(({ error, path }) => {
    logger.error(path, error instanceof Error ? error.message : String(error));

    const e = error as any;

    if (e.code === "INTERNAL_SERVER_ERROR") {
      e.message = "";
    }

    e.name = "";
    e.stack = undefined;
    e.cause = undefined;
  })
  .use(cors({ credentials: true, origin: config.allowedOrigins }))
  .trace(async ({ onHandle }) => {
    onHandle(({ begin, onStop }) => {
      onStop(({ end }) => logger.info("handle took", end - begin, "ms"));
    });
  })
  .mount("/auth", auth.handler)
  .use(authPlugin)
  .use(router);

export type App = typeof app;
