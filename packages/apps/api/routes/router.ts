import { Elysia } from "elysia";
import { invitationsRouter } from "./common/invitations";
import { ssoRouter } from "./common/sso";
import { threadsRouter } from "./common/threads";
import { usersRouter } from "./common/users";
import { garageRouter } from "./garage";
import { mcpServersRouter } from "./mcp/servers";
import { mcpOauthRouter } from "./mcp/oauth";

export const router = new Elysia()
  .use(invitationsRouter)
  .use(ssoRouter)
  .use(threadsRouter)
  .use(usersRouter)
  //.use(garageRouter)
  .use(mcpServersRouter)
  .use(mcpOauthRouter);
