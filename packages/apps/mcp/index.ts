import { logger } from "@saas/logger";
import { app } from "./server/index";

const port = process.env.PORT ?? 3001;

app.listen(port, ({ port }) => {
  logger.info(`MCP server running at http://localhost:${port}`);
});
