# SmartSilo — Codebase Guide

## Workspace layout

```
packages/
  apps/
    api/        — Elysia HTTP API server
    agent/      — Elysia WebSocket agent server
    admin/      — SvelteKit admin dashboard
    web/        — SvelteKit end-user chat UI
    mcp/        — MCP tool server (HTTP transport)
    worker/     — Background job worker
  core/
    agent/      — AI agent class, approval channel, init
    auth/       — BetterAuth wrapper, RBAC, session helpers
    db/         — Kysely client, Prisma schema, RLS helpers
    dbops/      — Shared query helpers (userQuery etc.)
    memory/     — Agent thread message store + compression
    types/      — Shared TypeScript types
  lib/
    llm/        — LLM client (Anthropic + OpenAI, structured output via zod)
    cache/      — Cache helpers
    comm/       — Email (Resend)
    logger/     — Logger
    rate-limit/ — Rate limiting
    storage/    — File storage
  extensions/
    garage/     — Automotive repair extension (tools, manifest, routes)
    clinic/     — Medical clinic extension
    dealership/ — Vehicle dealership extension
```

## Package manager

Bun workspaces. Always run `bun install` from the repo root after changing any `package.json`.

---

## Key architectural decisions

### Agent (`packages/core/agent/`)

- `Agent` class is **stateful** — `capabilities()` writes to `this.connections`, `run()` reads from it. Never share one instance across concurrent users.
- Use `Agent.createAgent()` (not `Agent.agent` singleton) for WebSocket connections — each connection gets its own isolated instance.
- `Agent.agent` singleton exists for single-caller use cases (e.g. background workers).
- `approvalChannel` lives on the `Agent` instance, not passed per-run. Approval IDs are UUIDs so the shared channel is safe across concurrent connections.
- `systemPrompt` is a **per-run param** (in `RunParams`), not agent config. It is built dynamically per WebSocket message from org/user context + connected tool capabilities.

### MCP servers (`packages/apps/mcp/`, `McpServer` table)

Two types of servers:
- **INTERNAL** — one per org, provisioned automatically, contains the org's own extension tools (garage/clinic/dealership).
- **EXTERNAL** — third-party servers. Two sub-categories:
  - **Org-level** (set by admin): `organizationId` is set, `userId` is null. `addedBy`/`addedById` tracks who added it (audit trail).
  - **User-level / personal**: `userId` is set, `organizationId` is null. Back-relation on `User`: `userMcpServers`.

The `McpServer` table is queried in the WS upgrade handler to get all active servers for a user:
```ts
WHERE isActive = true AND (organizationId = org.id OR userId = user.id)
```

### Memory (`packages/core/memory/`)

- `AgentThread` — one per org+user, holds the conversation.
- `AgentThreadMessage` — individual messages (normalized, not a JSON blob).
- `loadThreadMessages(orgId, userId)` — single JOIN query, no two-step lookup.
- `saveMessages(orgId, userId, messages[])` — upserts thread, inserts rows.
- `compressThreadMessages(messages, orgId, userId)` — called when thread exceeds 50 messages. Uses `LLM.llm` (claude-sonnet-4-6) to summarise old messages, deletes them from DB, inserts two summary rows.
- Memory package depends on `@saas/llm` (not `@anthropic-ai/sdk` directly).

### LLM (`packages/lib/llm/`)

- Always use `LLM.llm.create()` for any LLM calls outside the agent loop (structured output via zod).
- Export `z` from the LLM package (`@saas/llm`) so consumers don't need a separate `zod` dep.
- Must be configured and initialised before use (`LLM.configureLLM` + `LLM.initLLM`).

### Database (`packages/core/db/`)

- Kysely for queries. Always use `setRls(trx, orgId)` inside transactions that touch tenant-scoped data.
- After schema changes, run `bun run gen` from `packages/core/db/` to regenerate Kysely types.
- Prefer single-query joins over multiple round trips. Run independent queries in parallel with `Promise.all`.

### App init pattern

Every app (api, agent) follows the same three-file pattern:
- `config.ts` — `configure*()` validates and stores config, calls downstream `configure*()` on each service.
- `init.ts` — reads `process.env.*_CONFIG` (JSON), calls `configure*()`, then calls `init*()` on each service.
- `server/app.ts` — calls `initServices()` at module load, creates the Elysia app.

The agent app **does not** call `Agent.initAgent()` — it uses `Agent.createAgent()` per connection instead.

---

## WebSocket agent flow (`packages/apps/agent/routes/ws.ts`)

1. **`upgrade`**: authenticates via `getAuth().api.getSession()`, loads user+org via `getAuthenticatedUser()`, queries all active MCP servers (org + personal), calls `agent.capabilities(servers)`, stores everything in `ws.data`.
2. **`open`**: sends `{ type: "connected", capabilities: [...] }` to the client immediately — this populates the capabilities sidebar in the web UI.
3. **`message`**: handles two event types:
   - `approval_response` — calls `agent.approvalChannel.resolve()`
   - `message` — loads thread history, calls `agent.run()`, streams events to client, saves messages.
4. **`close`**: calls `agent.approvalChannel.cleanup()`.

### System prompt

Built per-message from `SessionData` (org name, industry, user name, role, date) + connected capabilities grouped by server. Each server section lists its tools with descriptions. This means the prompt automatically reflects connected external servers (Gmail, etc.) without manual maintenance.

---

## Web UI (`packages/apps/web/`)

- Uses **Svelte 5 runes** — no Svelte stores. Shared reactive state lives in `websocket.svelte.ts` (`.svelte.ts` extension required for runes outside components).
- WebSocket connects to `/agent` (no per-org slug — single org per user).
- Capabilities are populated from the `connected` event on open, not from `done`.
- `CapabilityItem` clicking pre-fills the input with the tool name as a prompt seed.

---

## DB schema notes

### `Organization`
- `domain` is the unique identifier (was `namespace` in older code — use `domain` everywhere).
- No `namespace` column exists.

### `McpServer`
- `organizationId` — org-level servers (null for personal)
- `userId` — personal/user-level servers (null for org-level)
- `addedBy`/`addedById` — audit trail for who added org-level external servers
- `type`: `INTERNAL` | `EXTERNAL`

### `AgentThread` / `AgentThreadMessage`
- Replaced old `AgentConversation` (JSON blob). Messages are now individual rows.
- `MessageRole` enum: `USER` | `ASSISTANT`

### User relations (auth.prisma)
- `organizationMemberships` — org memberships (replaces old `memberships`)
- `userMcpServers` — personal MCP servers (`@relation("UserMcpServers")`)
- `organizationMcpServers` — org servers added by this user (`@relation("OrganizationMcpServers")`)

---

## Extensions (`packages/extensions/`)

Each extension (garage, clinic, dealership) follows the same internal structure:

```
lib/
  services/
    <domain>/
      <file>.ts    — named schema exports (EntityActionSchema) + default export with generic names
      index.ts     — export * from each file + export default { file1, file2 }
    index.ts       — export * from each domain + export default { inventory, jobs, customers }
  index.ts         — export * from './services' + export default { services }
services/
  <domain>/
    <file>.ts      — service functions + export default { fn1, fn2, ... }
    index.ts       — export default { file1, file2 }
  index.ts         — export default { inventory, jobs, customers }
index.ts           — export default { lib, services }
```

### Export pattern

Each folder's `index.ts` does two things: re-exports named exports flat (for internal imports) and assembles a default export namespace (for external consumers):

```ts
// lib/services/jobs/index.ts
import workOrders from './work-orders'

export * from './work-orders'          // named exports — internal use

export default { workOrders }          // namespace chain — external use
```

This gives two access modes from the same source of truth:

```ts
// Internal (service files importing schemas)
import { ListWorkOrdersSchema } from '../../lib'

// External (API, MCP consuming the extension)
import garage from '@saas/garage'
garage.lib.services.jobs.workOrders.ListSchema
garage.services.jobs.workOrders.list(db, input)
```

### Types

Export an inferred type immediately after each schema definition. Type name = schema name without the `Schema` suffix:

```ts
export const ListPartsSchema = z.object({ ... })
export type  ListParts       = z.infer<typeof ListPartsSchema>
```

Service functions import the type directly — no `z.infer<typeof ...>` at the call site:

```ts
import type { ListParts } from '../../lib'

export const list = async (db: KyselyContext, input: ListParts) => { ... }
```

Always leave a blank line between every top-level definition — schema, type, function, or const. No exceptions:

```ts
// ✅
export const ListPartsSchema = z.object({ ... })

export type ListParts = z.infer<typeof ListPartsSchema>

export const GetPartBySkuSchema = z.object({ ... })

export type GetPartBySku = z.infer<typeof GetPartBySkuSchema>

// ✗ — missing blank lines
export const ListPartsSchema = z.object({ ... })
export type ListParts = z.infer<typeof ListPartsSchema>
export const GetPartBySkuSchema = z.object({ ... })
```

### Schema naming

Schema files export two forms:
- **Named exports** use `EntityActionSchema` (PascalCase, entity-prefixed) — unambiguous when barrel-exported flat internally.
- **Default export** uses generic names (`ListSchema`, `GetSchema`, `CreateSchema`) — the namespace path provides the entity context for external consumers.

```ts
// lib/services/inventory/parts.ts
export const ListPartsSchema = z.object({ ... })   // named — internal

export default {
  ListSchema: ListPartsSchema,                      // generic — external via garage.lib.services.inventory.parts.ListSchema
}
```

### Service functions

- Accept `db: KyselyContext` as the first param — never import `db` directly. This keeps services transaction-safe and RLS-aware (the caller sets up `setRls` on the transaction before passing it down).
- No default value for `db` — omitting it must be a compile error to prevent silent RLS bypass.
- Input typed via `z.infer<typeof XxxSchema>` imported from `../../lib`.

```ts
import { ListPartsSchema } from '../../lib'

export const list = async (db: KyselyContext, input: z.infer<typeof ListPartsSchema>) => { ... }

export default { list, getBySku, ... }
```

---

## Code style

### Functions

Prefer arrow functions over `function` declarations:

```ts
// ✅
export const list = async (db: KyselyContext, input: z.infer<typeof ListPartsSchema>) => { ... }

// ✗
export async function list(db: KyselyContext, input: z.infer<typeof ListPartsSchema>) { ... }
```

---

## Naming conventions

| Old name | New name | Location |
|---|---|---|
| `RunOptions` | `RunParams` | `core/agent/agent.ts` |
| `AgentContext` | removed | — |
| `StreamEvent` | removed from agent package | — |
| `loadHistory` | `loadThreadMessages` | `core/memory/store.ts` |
| `compressHistory` | `compressThreadMessages` | `core/memory/util.ts` |
| `summarise.ts` | `util.ts` | `core/memory/` |
| `AgentConversation` | `AgentThread` + `AgentThreadMessage` | `db/prisma/schema/ai.prisma` |
| `namespace` (org) | `domain` | `db/prisma/schema/organization.prisma` |
| `memberships` (User) | `organizationMemberships` | `db/prisma/schema/auth.prisma` |
