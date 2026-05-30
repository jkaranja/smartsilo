import { logger } from "@saas/logger";
import { app } from "./server/app";
import "./routes/ws";

const port = process.env.PORT ?? 3003;

app.listen(port, ({ port }) => {
  logger.info(`Agent running at http://localhost:${port}`);
});
