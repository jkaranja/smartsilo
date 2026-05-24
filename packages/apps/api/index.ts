import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { Auth } from "@saas/auth";
import { logger } from "@saas/logger";
import { router } from "./router";
import { initServices } from "./init";
import { getApiConfig } from "./config";

const port = process.env.PORT ?? 4321;

initServices();

const config = getApiConfig();

const auth = Auth.getAuth();

const betterAuth = new Elysia({ name: "better-auth" })
  .mount("/auth", auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return status(401);

        return await Auth.getContext({ userId: session.user.id });
      },
    },
  });

new Elysia()
  .use(cors({ credentials: true, origin: config.allowedOrigins }))
  .trace(async ({ onHandle }) => {
    onHandle(({ begin, onStop }) => {
      onStop(({ end }) => logger.info("handle took", end - begin, "ms"));
    });
  })
  .use(betterAuth)
  .use(router)
  .listen(port, ({ port }) => {
    logger.info(`API running at http://localhost:${port}`);
  });
