import { getAuth, getAuthenticatedUser, getPermissions } from "@saas/auth";
import { kysely } from "@saas/db";
import { Agent } from "@saas/agent";
import type { Message } from "@saas/agent";
import { loadThreadMessages, saveMessages } from "@saas/memory";
import { app } from "../server/app";

interface SessionData {
  orgId: string;
  orgName: string;
  orgDomain: string;
  industry: string;
  userId: string;
  userName: string;
  role: string;
  permissions: string[];
  serverConfigs: {
    url: string;
    authToken?: string;
    name: string;
    type: string;
    tools: any[];
    manifest: any;
  }[];
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
      .select(["name", "type", "serverUrl", "authToken", "tools", "manifest"])
      .where("isActive", "=", true)
      .where((eb) =>
        eb.or([eb("organizationId", "=", org.id), eb("userId", "=", user.id)]),
      )
      .execute();

    if (!servers.length) {
      set.status = 503;
      return;
    }

    const permissions = getPermissions(org.role.toLowerCase());

    const serverConfigs = servers.map((s) => ({
      name: s.name,
      type: s.type,
      url: s.serverUrl,
      authToken:
        s.type === "INTERNAL"
          ? session.session.token
          : (s.authToken ?? undefined),
      tools: s.tools,
      manifest: s.manifest,
    }));

    const agent = Agent.createAgent();

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
        serverConfigs,
        agent,
      } satisfies SessionData,
    };
  },

  open(ws) {
    const ctx = ws.data as unknown as SessionData;

    const internal = ctx.serverConfigs.find((s) => s.type === "INTERNAL");
    const capabilities = internal?.manifest?.capabilities ?? [];

    const apps = ctx.serverConfigs
      .filter((s) => s.type === "EXTERNAL")
      .map((s) => ({ name: s.name }));

    console.log(capabilities);

    ws.send(JSON.stringify({ type: "connected", capabilities, apps }));
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
      const context = (event.context as string) || "general";

      if (!userMessage) return;

      // past thread messages -> history
      const threadMessages = await loadThreadMessages(
        ctx.orgId,
        ctx.userId,
        context,
      );

      const assistantChunks: string[] = [];

      const message: Message = { role: "user", content: userMessage };

      try {
        for await (const streamEvent of ctx.agent.run({
          message,
          threadMessages,
          systemPrompt: buildSystemPrompt(ctx),
          serverConfigs: ctx.serverConfigs,
        })) {
          ws.send(JSON.stringify(streamEvent));
          if (streamEvent.type === "text_delta")
            assistantChunks.push((streamEvent as any).text);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Agent error";
        ws.send(JSON.stringify({ type: "error", message: msg }));
      }

      await saveMessages(
        ctx.orgId,
        ctx.userId,
        [
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantChunks.join("") },
        ],
        context,
      );
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

  const toolSections = ctx.serverConfigs
    .map(({ name, tools }) => {
      const toolList = tools
        .map((t: any) => `  - ${t.name}: ${t.description ?? ""}`)
        .join("\n");
      return `### ${name}\n${toolList}`;
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
