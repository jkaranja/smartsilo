import { getAuth, getAuthenticatedUser, getPermissions } from "@saas/auth";
import { kysely } from "@saas/db";
import { Agent } from "@saas/agent";
import type { Message, Capabilities } from "@saas/agent";
import { loadThreadMessages, saveMessages } from "@saas/memory";
import { app } from "../server/app";

interface ClientCapability {
  name: string;
  description: string;
  source: string;
  needsApproval: boolean;
}

interface SessionData {
  orgId: string;
  orgName: string;
  orgDomain: string;
  industry: string;
  userId: string;
  userName: string;
  role: string;
  permissions: string[];
  capabilities: Capabilities;
  clientCapabilities: ClientCapability[];
  agent: ReturnType<typeof Agent.createAgent>;
}

app.ws("/agent", {
  async upgrade({ headers, set }) {
    const session = await getAuth().api.getSession({
      headers: headers as unknown as Headers,
    });
    if (!session?.user) {
      set.status = 401;
      return;
    }

    const user = await getAuthenticatedUser({ userId: session.user.id });
    if (!user) {
      set.status = 401;
      return;
    }

    const org = user.organizations?.[0];

    if (!org) {
      set.status = 404;
      return;
    }

    const servers = await kysely
      .selectFrom("McpServer")
      .select(["serverUrl", "authToken"])
      .where("isActive", "=", true)
      .where((eb) =>
        eb.or([eb("organizationId", "=", org.id), eb("userId", "=", user.id)]),
      )
      .execute();

    // const serverConfigs = servers.map((s) => ({
    //   url: s.serverUrl,
    //   // internal server uses the user's session token — already validated by our mcpHandler
    //   // external servers use their own stored OAuth access token
    //   authToken:
    //     s.type === "INTERNAL"
    //       ? session.session.token
    //       : (s.authToken ?? undefined),
    //   tools: (s.tools as Tool[] | null) ?? [],
    // }));

    if (!servers.length) {
      set.status = 503;
      return;
    }

    const permissions = getPermissions(org.role.toLowerCase());

    const agent = Agent.createAgent();

    const _capabilities = await agent.capabilities(
      servers.map((s) => ({
        url: s.serverUrl,
        authToken: s.authToken ?? undefined,
      })),
    );

    const capabilities = _capabilities.map(({ serverInfo, tools }) => ({
      serverInfo,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
      })),
    }));

    const clientCapabilities: ClientCapability[] = _capabilities.flatMap(
      ({ serverInfo, tools }) =>
        tools.map((t) => ({
          name: t.name,
          description: t.description ?? "",
          source: serverInfo.title ?? serverInfo.name,
          needsApproval: (t as any).annotations?.readOnlyHint !== true,
        })),
    );

    return {
      data: {
        orgId: org.id,
        orgName: org.name,
        orgDomain: org.domain,
        industry: org.industry,
        userId: user.id,
        userName: user.name ?? "User",
        role: org.role,
        permissions,
        capabilities,
        clientCapabilities,
        agent: agent,
      } satisfies SessionData,
    };
  },

  open(ws) {
    const ctx = ws.data as unknown as SessionData;
    ws.send(
      JSON.stringify({
        type: "connected",
        capabilities: ctx.clientCapabilities,
      }),
    );
  },

  async message(ws, raw) {
    const ctx = ws.data as unknown as SessionData;
    let event: { type: string; [key: string]: unknown };

    try {
      event = JSON.parse(raw as string);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (event.type === "approval_response") {
      ctx.agent.approvalChannel.resolve(
        event.approvalId as string,
        event.approved as boolean,
      );
      return;
    }

    if (event.type === "message") {
      const userMessage = (event.text as string)?.trim();

      if (!userMessage) return;

      // past thread messages -> history
      const threadMessages = await loadThreadMessages(ctx.orgId, ctx.userId);

      const assistantChunks: string[] = [];

      const message: Message = { role: "user", content: userMessage };

      try {
        for await (const streamEvent of ctx.agent.run({
          message,
          threadMessages,
          systemPrompt: buildSystemPrompt(ctx),
        })) {
          ws.send(JSON.stringify(streamEvent));
          if (streamEvent.type === "text_delta")
            assistantChunks.push((streamEvent as any).text);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Agent error";
        ws.send(JSON.stringify({ type: "error", message: msg }));
      }

      await saveMessages(ctx.orgId, ctx.userId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantChunks.join("") },
      ]);
    }
  },

  close(ws) {
    (ws.data as unknown as SessionData).agent.approvalChannel.cleanup();
  },
});

const industryLabel: Record<string, string> = {
  GARAGE: "an automotive repair garage",
  CLINIC: "a medical clinic",
  DEALERSHIP: "a vehicle dealership",
};

const roleLabel: Record<string, string> = {
  owner: "the business owner with full access",
  mechanic: "a mechanic who handles vehicle repairs and parts",
  physician: "a physician who sees patients and manages medications",
  nurse: "a nurse who assists with patient care",
  receptionist: "a receptionist who manages appointments and patient intake",
  sales: "a sales representative managing vehicle deals",
  finance: "a finance manager handling deal financing",
  service_advisor:
    "a service advisor managing customer relationships and work orders",
  manager: "a manager with operational access",
  admin: "an administrator with full access",
};

function buildSystemPrompt(ctx: SessionData): string {
  const industry = industryLabel[ctx.industry.toUpperCase()] ?? ctx.industry;

  const role = roleLabel[ctx.role.toLowerCase()] ?? ctx.role;

  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const toolSections = ctx.capabilities
    .map(({ serverInfo, tools }) => {
      const title = serverInfo.title ?? serverInfo.name;
      const desc = serverInfo.description ? `\n${serverInfo.description}` : "";
      const toolList = tools
        .map((t) => `  - ${t.name}: ${t.description}`)
        .join("\n");
      return `### ${title}${desc}\n${toolList}`;
    })
    .join("\n\n");

  return `You are an intelligent AI assistant for ${ctx.orgName}, ${industry}.

## Context
User: ${ctx.userName} — ${role}
Date: ${date}

## Behaviour
- You are deeply integrated with this business — use tools naturally to act on real data.
- Be concise and action-oriented. After completing an action, confirm what you did and suggest the next logical step.
- Before any irreversible action (sending messages, creating orders, deleting records), confirm intent.
- If a tool call fails, explain what happened and offer an alternative.
- Access is scoped to ${ctx.orgName} only — never reference or expose data from other organisations.

## Available tools

${toolSections}`;
}
