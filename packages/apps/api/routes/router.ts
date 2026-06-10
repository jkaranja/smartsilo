import { Elysia } from "elysia";
import { invitationsRouter } from "./common/invitations";
import { ssoRouter } from "./common/sso";
import { threadsRouter } from "./common/threads";
import { usersRouter } from "./common/users";
import { garageRouter } from "./garage";
import { mcpServersRouter } from "./mcp/servers";
import { mcpOauthRouter } from "./mcp/oauth";
import { agentRouter } from "./agent";
import { contextPlugin } from "../server";

const publicRouter = new Elysia({ prefix: "/api" }).use(invitationsRouter);

const protectedRouter = new Elysia({ prefix: "/api" })
  .use(contextPlugin)
  .onBeforeHandle(({ user, status }: any) => {
    if (!user) return status(401);
  })
  .use(ssoRouter)
  .use(threadsRouter)
  .use(usersRouter)
  //.use(garageRouter)
  .use(mcpServersRouter)
  .use(mcpOauthRouter)
  .use(agentRouter);

export const router = { public: publicRouter, protected: protectedRouter };
