import { logger } from "@saas/logger";
import { app } from "./server/app";
import "./server/router";

const port = process.env.PORT ?? 4321;

app.listen(port, ({ port }) => {
  logger.info(`API running at http://localhost:${port}`);
});
