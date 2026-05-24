---
name: saas-agent-ui
description: >
  Build an AI-first agent UI for a multi-tenant SaaS platform using SvelteKit,
  Elysia WebSockets, Anthropic streaming, and MCP tool integration. Use this skill
  whenever the user asks to build the frontend, agent gateway, agent runtime, conversation
  memory, WebSocket layer, approval flow, capabilities panel, or any part of the
  AI-first chat interface for this platform. Also triggers when the user mentions
  streaming agent responses, tool call UI, approval cards, external MCP server
  connections, or the SvelteKit web app. Always use this skill before writing any
  agent, WebSocket, or frontend code — it contains critical architecture decisions,
  code patterns, and file layouts that must be followed exactly.
---

# AI-First Agent UI — Build Guide

This skill covers the complete agent UI layer for the multi-tenant SaaS platform.
Read this before writing any frontend, WebSocket, agent runtime, or memory code.

## What we are building

Not a traditional SaaS UI with navigation menus and buttons.
The agent IS the UI. A persistent chat on the left, live capabilities on the right.
No top nav, no sidebar, no "go to settings" — users describe what they need and
the agent does it, using tools from the platform and any external MCP servers the
tenant has connected (Gmail, WhatsApp, etc).

## Architecture overview

```
SvelteKit frontend (web/)
  ↕ WebSocket (persistent, one per session)
Agent gateway (apps/agent/ — port 3003)
  ↕ delegates to
Agent runtime (packages/core/agent/)
  ↕ tool calls
MCP server host (apps/mcp/ — already built)
  ↕ includes
External MCP servers (Gmail, WhatsApp, tenant-registered)
  ↕ reads/writes
Pool or silo DB — withTenant() + RLS always active
  ↕ conversation history
Memory module (packages/core/memory/)
```

## New packages and apps to create

```
packages/core/agent/     @saas/agent       — runtime, prompt builder, approval
packages/core/memory/    @saas/memory      — conversation persistence, summarisation
packages/apps/agent/     @saas/agent-app   — WebSocket gateway, port 3003
packages/apps/web/       @saas/web         — SvelteKit + Tailwind frontend
```

Add to root package.json scripts:
```json
"dev:agent": "cd packages/apps/agent && bun --watch index.ts",
"dev:web":   "cd packages/apps/web   && bun --watch -- vite dev"
```

## New Prisma models (add to prisma/schema/core.prisma)

```prisma
model AgentConversation {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid             @map("tenant_id")
  userId    String   @db.Uuid             @map("user_id")
  messages  Json     @default("[]")
  createdAt DateTime @default(now())      @map("created_at")
  updatedAt DateTime @updatedAt           @map("updated_at")

  user      User     @relation(fields: [userId], references: [id])

  @@unique([tenantId, userId])
  @@index([tenantId, userId])
  @@map("agent_conversations")
}

model ExternalMcpServer {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid             @map("tenant_id")
  name        String
  serverUrl   String                        @map("server_url")
  authToken   String?                       @map("auth_token")
  scopes      String[] @default([])
  isActive    Boolean  @default(true)       @map("is_active")
  connectedAt DateTime @default(now())      @map("connected_at")
  connectedBy String   @db.Uuid             @map("connected_by")

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("external_mcp_servers")
}
```

After adding models: run `bun db:migrate` then `bun db:rls` to add RLS policies.

## WebSocket event protocol

All messages between frontend and agent gateway are JSON with a `type` field.

### Frontend → gateway
```typescript
{ type: 'message',           text: string }
{ type: 'approval_response', approvalId: string, approved: boolean }
```

### Gateway → frontend (streamed)
```typescript
{ type: 'text_delta',        text: string }
{ type: 'tool_call',         tool: string, input: unknown }
{ type: 'tool_result',       tool: string, result: unknown }
{ type: 'approval_required', approvalId: string, tool: string, input: unknown, description: string }
{ type: 'approval_granted',  approvalId: string }
{ type: 'done',              availableTools: Capability[] }
{ type: 'error',             message: string }
```

## Critical rules — never break these

1. Agent runtime always uses `withTenant()` — RLS must be active on every DB query
2. Approval policy is enforced in runtime code, not by prompting the LLM
3. `approval: 'human'` always pauses regardless of any other setting
4. WebSocket session context (tenantId, userId, role) is resolved once on connect —
   never re-derived per message
5. External MCP servers are scoped to the tenant — one tenant cannot see another's connected apps
6. Conversation history is loaded from DB on WebSocket open — agent always has memory
7. System prompt is built dynamically per session — always includes industry + role

## Reference files

Read these when building each component:

- `references/agent-runtime.md`   — think/tool/observe loop, streaming, Anthropic SDK usage
- `references/websocket-gateway.md` — Elysia WebSocket server, session management
- `references/memory.md`          — conversation persistence, context window management
- `references/svelte-ui.md`       — SvelteKit frontend, chat panel, capabilities panel
- `references/approval-channel.md` — pause/resume mechanics for human-in-the-loop
- `references/external-mcp.md`    — connecting tenant-registered external MCP servers

## Build order for this skill

Follow this sequence. Do not skip ahead.

```
1. Add Prisma models → migrate → apply RLS
2. packages/core/memory/    — loadHistory, saveMessage, summarise
3. packages/core/agent/     — runtime.ts, prompt.ts, approval.ts
4. packages/apps/agent/     — WebSocket gateway
5. packages/apps/web/       — SvelteKit UI
6. Wire external MCP servers into tool registry
```

## Package.json for each new package

```json
// packages/core/agent/package.json
{
  "name": "@saas/agent",
  "module": "index.ts",
  "private": true,
  "dependencies": {
    "@saas/db":    "workspace:*",
    "@saas/auth":  "workspace:*",
    "@saas/mcp":   "workspace:*",
    "@anthropic-ai/sdk": "latest"
  }
}

// packages/core/memory/package.json
{
  "name": "@saas/memory",
  "module": "index.ts",
  "private": true,
  "dependencies": {
    "@saas/db":  "workspace:*",
    "@anthropic-ai/sdk": "latest"
  }
}

// packages/apps/agent/package.json
{
  "name": "@saas/agent-app",
  "module": "index.ts",
  "private": true,
  "dependencies": {
    "@saas/agent":  "workspace:*",
    "@saas/auth":   "workspace:*",
    "@saas/db":     "workspace:*",
    "@saas/memory": "workspace:*",
    "elysia":       "latest"
  }
}

// packages/apps/web/package.json
{
  "name": "@saas/web",
  "private": true,
  "dependencies": {
    "@sveltejs/kit": "latest",
    "svelte":        "latest",
    "tailwindcss":   "latest",
    "vite":          "latest"
  }
}
```
