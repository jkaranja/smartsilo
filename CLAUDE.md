# CLAUDE.md — Read this before touching any code

This is a multi-tenant, multi-industry enterprise SaaS platform.
Read every section before writing any code. These are hard constraints, not suggestions.

---

## What this platform is

A SaaS product that delivers enterprise system capabilities to companies across multiple
industries (garages, clinics, dealerships — more to come). Each company is a tenant.
The platform is AI-first — every industry module exposes MCP tools, has a built-in
AI copilot, and supports external AI clients (Claude Desktop, ChatGPT) via MCP.

---

## The single most important design principle

**The unit of isolation is the TENANT (company), not the industry.**

A garage and a clinic are different industries but the same isolation model applies to both.
Two clinics (WellCare and SmallClinic) share the clinic module but their data is completely
isolated from each other. This principle applies to every layer: data, auth, files, cache,
AI, MCP tools.

---

## Stack — every decision is final unless noted

```
Runtime         Bun
API framework   Elysia  (REST + OpenAPI via @elysiajs/swagger — NO tRPC)
Auth            Better Auth  (organisations plugin, SSO, MCP OAuth)
Schema          Prisma  (migrations ONLY — never import or use PrismaClient)
                Multi-file schema via prismaSchemaFolder preview feature
Query builder   Kysely  (all DB queries — RLS-safe explicit transactions)
Database        Neon Postgres  (3 Neon projects: control-plane, pool, silos)
Cache           Upstash Redis  (tenant registry, rate limiting, AI cache, aggregates)
Rate limiting   @upstash/ratelimit  (built-in SDK — do not build manually)
File storage    Google Cloud Storage  (path-namespaced per tenant)
Hosting         Cloud Run  (Bun container — scales to zero)
MCP SDK         @modelcontextprotocol/sdk
Frontend        SvelteKit + Tailwind  (not started — do not scaffold yet)
```

---

## Project structure

```
my-saas/
├── CLAUDE.md
├── package.json                         ← Bun workspaces root
├── bunfig.toml
├── tsconfig.json
├── .env.example
│
├── packages/                            ← all source code lives here
│   │
│   ├── core/                            ← shared infrastructure, no business logic
│   │   ├── db/
│   │   │   ├── package.json             ← name: "@saas/db"
│   │   │   ├── index.ts
│   │   │   ├── client.ts                ← Kysely client factory
│   │   │   ├── connection-router.ts     ← resolveTenant() + withTenant() + getDb()
│   │   │   ├── control-plane.ts         ← control plane Kysely instance
│   │   │   ├── types.ts                 ← Kysely DB type defs (generated from Prisma)
│   │   │   ├── prisma.config.ts         ← Prisma config pointing to prisma/schema
│   │   │   └── prisma/                  ← schema + migrations live inside @saas/db
│   │   │       ├── schema/
│   │   │       │   ├── schema.prisma
│   │   │       │   ├── enums.prisma
│   │   │       │   ├── control-plane.prisma
│   │   │       │   ├── better-auth.prisma
│   │   │       │   ├── core.prisma
│   │   │       │   ├── garage.prisma
│   │   │       │   ├── clinic.prisma
│   │   │       │   └── dealership.prisma
│   │   │       ├── rls.sql
│   │   │       └── migrations/
│   │   ├── auth/
│   │   │   ├── package.json             ← name: "@saas/auth"
│   │   │   ├── index.ts                 ← Better Auth instance
│   │   │   ├── context.ts               ← RequestContext type (tenantId, userId, role …)
│   │   │   ├── middleware.ts            ← Elysia gatewayMiddleware (derive)
│   │   │   └── rbac.ts                  ← requirePermission(role, permission)
│   │   ├── cache/
│   │   │   ├── package.json             ← name: "@saas/cache"
│   │   │   ├── index.ts                 ← Upstash Redis client
│   │   │   ├── tenant-cache.ts          ← tenant registry cache helpers
│   │   │   └── rate-limit.ts            ← @upstash/ratelimit wrappers
│   │   └── types/
│   │       ├── package.json             ← name: "@saas/types"
│   │       ├── tenant.ts
│   │       ├── auth.ts
│   │       └── industry.ts
│   │
│   ├── lib/                             ← utility libraries (no business logic)
│   │   ├── llm/
│   │   │   ├── package.json             ← name: "@saas/llm"
│   │   │   └── index.ts                 ← direct Anthropic model access
│   │   └── storage/
│   │       ├── package.json             ← name: "@saas/storage"
│   │       └── index.ts                 ← GCS client + presigned URL helpers
│   │
│   ├── extensions/                      ← one folder per industry (extends core)
│   │   ├── garage/
│   │   │   ├── package.json             ← name: "@saas/garage"
│   │   │   ├── manifest.ts              ← MCP tool defs + permissions + approval levels
│   │   │   ├── service.ts               ← GarageService — ALL business logic here
│   │   │   ├── routes.ts                ← Elysia REST routes — thin wrappers over service
│   │   │   ├── handlers.ts              ← MCP tool handlers — thin wrappers over service
│   │   │   └── CLAUDE.md                ← garage-specific conventions
│   │   ├── clinic/
│   │   │   ├── package.json             ← name: "@saas/clinic"
│   │   │   ├── manifest.ts
│   │   │   ├── service.ts
│   │   │   ├── routes.ts
│   │   │   └── handlers.ts
│   │   └── dealership/
│   │       ├── package.json             ← name: "@saas/dealership"
│   │       ├── manifest.ts
│   │       ├── service.ts
│   │       ├── routes.ts
│   │       └── handlers.ts
│   │
│   └── apps/                            ← runnable entry points — thin wiring only
│       ├── api/
│       │   ├── package.json             ← name: "@saas/api"
│       │   ├── index.ts                 ← Elysia server, port 3000
│       │   └── router.ts                ← mounts all module routes
│       ├── mcp/
│       │   ├── package.json             ← name: "@saas/mcp"
│       │   ├── index.ts                 ← MCP server, port 3001
│       │   ├── server-host.ts           ← createMcpServer(tenantId, industry, ...)
│       │   ├── tool-registry.ts         ← per-tenant plan tool access control
│       │   ├── dcr.ts                   ← RFC 7591 dynamic client registration
│       │   └── oauth.ts                 ← PKCE flow + MCP token issuance
│       ├── worker/
│       │   ├── package.json             ← name: "@saas/worker"
│       │   ├── index.ts                 ← background jobs, port 3002
│       │   ├── notifications.ts
│       │   ├── rag-indexer.ts
│       │   └── billing-meter.ts
│       └── web/                         ← SvelteKit (not started yet)
│           └── package.json             ← name: "@saas/web"
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       ├── migrate.yml
│       └── test.yml
│
├── docker/
│   ├── api.Dockerfile
│   ├── mcp.Dockerfile
│   └── worker.Dockerfile
│
├── scripts/
│   ├── migrate-all.ts                   ← runs migrations on pool + every silo
│   └── apply-rls.ts                     ← applies rls.sql on pool + every silo
│
└── docs/
    └── decisions/
        ├── 001-tenant-isolation.md
        ├── 002-industry-modules.md
        ├── 003-auth-betterauth.md
        └── 004-ai-mcp-layer.md
```

---

## Workspaces

```json
{
  "name": "my-saas",
  "private": true,
  "workspaces": [
    "packages/**"
  ]
}
```

`packages/**` resolves any nested `package.json` automatically — Bun walks the tree.
All sub-packages use scoped names and `workspace:*` for internal dependencies:

```json
// packages/core/db/package.json
{ "name": "@saas/db", "module": "index.ts", "private": true }

// packages/extensions/garage/package.json
{
  "name": "@saas/garage",
  "module": "index.ts",
  "private": true,
  "dependencies": {
    "@saas/db":    "workspace:*",
    "@saas/auth":  "workspace:*",
    "@saas/types": "workspace:*"
  }
}

// packages/apps/api/package.json
{
  "name": "@saas/api",
  "module": "index.ts",
  "private": true,
  "dependencies": {
    "@saas/garage":     "workspace:*",
    "@saas/clinic":     "workspace:*",
    "@saas/dealership": "workspace:*",
    "@saas/auth":       "workspace:*",
    "@saas/db":         "workspace:*",
    "@saas/cache":      "workspace:*"
  }
}
```

Dependency direction — one way only:

```
apps/*        →  extensions/*  →  core/*
extensions/*  →  lib/*
apps/*        →  lib/*

Never:  core/*        → extensions/* or apps/*
Never:  lib/*         → extensions/* or apps/*
Never:  extensions/*  → other extensions/* or apps/*
```

---

## Prisma multi-file schema

Enabled via `prismaSchemaFolder` preview feature in `schema.prisma`.
Each domain has its own file — edit clinic models without touching garage models.

### packages/core/db/prisma/schema/schema.prisma — config only, nothing else

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
  // Prisma Client is never used in application code
  // This generates types that Kysely uses for type safety
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

### packages/core/db/prisma/schema/enums.prisma

```prisma
enum Industry {
  GARAGE
  CLINIC
  DEALERSHIP
}

enum Plan {
  STARTER
  PRO
  ENTERPRISE
}

enum DbTier {
  POOL
  SILO
}

enum ActorType {
  USER
  AI_AGENT
  SYSTEM
}

enum WorkOrderStatus {
  OPEN
  IN_PROGRESS
  WAITING_PARTS
  CLOSED
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum PurchaseOrderStatus {
  PENDING
  CONFIRMED
  DELIVERED
  CANCELLED
}
```

### packages/core/db/prisma/schema/control-plane.prisma

```prisma
// Run against CONTROL_PLANE_DATABASE_URL only
// Separate Neon project — tenant routing, never business data

model Tenant {
  id            String   @id @default(uuid()) @db.Uuid
  slug          String   @unique
  name          String
  industry      Industry
  plan          Plan     @default(STARTER)
  dbTier        DbTier   @default(POOL)        @map("db_tier")
  connectionKey String   @default("pool-main") @map("connection_key")
  status        String   @default("active")
  createdAt     DateTime @default(now())       @map("created_at")

  mcpTokens    McpToken[]
  oauthClients OAuthClient[]
  invites      TenantInvite[]

  @@map("tenants")
}

model McpToken {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid             @map("tenant_id")
  userId     String    @db.Uuid             @map("user_id")
  tokenHash  String    @unique              @map("token_hash")
  scopes     String[]  @default([])
  name       String?
  lastUsedAt DateTime?                      @map("last_used_at")
  revokedAt  DateTime?                      @map("revoked_at")
  createdAt  DateTime  @default(now())      @map("created_at")

  tenant     Tenant    @relation(fields: [tenantId], references: [id])

  @@map("mcp_tokens")
}

model OAuthClient {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String?  @db.Uuid             @map("tenant_id")
  name         String
  redirectUris String[]                      @map("redirect_uris")
  grantTypes   String[]                      @map("grant_types")
  createdAt    DateTime @default(now())      @map("created_at")

  tenant       Tenant?  @relation(fields: [tenantId], references: [id])

  @@map("oauth_clients")
}

model TenantInvite {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid             @map("tenant_id")
  email      String
  role       String
  token      String    @unique
  invitedBy  String    @db.Uuid             @map("invited_by")
  expiresAt  DateTime                       @map("expires_at")
  acceptedAt DateTime?                      @map("accepted_at")
  createdAt  DateTime  @default(now())      @map("created_at")

  tenant     Tenant    @relation(fields: [tenantId], references: [id])

  @@map("tenant_invites")
}
```

### packages/core/db/prisma/schema/better-auth.prisma

```prisma
// Better Auth owns these tables — do NOT write to them from application code
// Table names match Better Auth's required naming exactly (lowercase)

model BetterAuthUser {
  id            String   @id
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt      @map("updated_at")

  sessions     BetterAuthSession[]
  accounts     BetterAuthAccount[]
  platformUser User?

  @@map("user")
}

model BetterAuthSession {
  id        String   @id
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  user      BetterAuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model BetterAuthAccount {
  id                    String    @id
  userId                String    @map("user_id")
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  accessToken           String?   @map("access_token")
  refreshToken          String?   @map("refresh_token")
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?
  idToken               String?   @map("id_token")
  password              String?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt      @map("updated_at")

  user      BetterAuthUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("account")
}

model BetterAuthVerification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt      @map("updated_at")

  @@map("verification")
}
```

### packages/core/db/prisma/schema/core.prisma

```prisma
// Shared core tables — pool DB and every silo
// Exists for every tenant regardless of industry

model User {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid             @map("tenant_id")
  email        String
  name         String?
  betterAuthId String?  @unique              @map("better_auth_id")
  createdAt    DateTime @default(now())      @map("created_at")

  betterAuthUser     BetterAuthUser?     @relation(fields: [betterAuthId], references: [id])
  memberships        TenantMembership[]
  auditLogs          AuditLog[]
  uploadedFiles      File[]
  assignedWorkOrders GarageWorkOrder[]   @relation("AssignedMechanic")
  clinicAppointments ClinicAppointment[] @relation("AttendingPhysician")

  @@unique([tenantId, email])
  @@map("users")
}

model TenantMembership {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid             @map("tenant_id")
  userId    String   @db.Uuid             @map("user_id")
  role      String
  createdAt DateTime @default(now())      @map("created_at")

  user      User     @relation(fields: [userId], references: [id])

  @@unique([tenantId, userId])
  @@map("tenant_memberships")
}

model AuditLog {
  id         BigInt    @id @default(autoincrement())
  tenantId   String    @db.Uuid             @map("tenant_id")
  actorId    String?   @db.Uuid             @map("actor_id")
  actorType  ActorType @default(USER)       @map("actor_type")
  action     String
  entity     String?
  entityId   String?   @db.Uuid             @map("entity_id")
  metadata   Json?
  occurredAt DateTime  @default(now())      @map("occurred_at")

  actor      User?     @relation(fields: [actorId], references: [id])

  @@index([tenantId, occurredAt])
  @@map("audit_log")
}

model File {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid             @map("tenant_id")
  storageKey   String                        @map("storage_key")
  originalName String?                       @map("original_name")
  mimeType     String?                       @map("mime_type")
  sizeBytes    BigInt?                       @map("size_bytes")
  uploadedBy   String?  @db.Uuid             @map("uploaded_by")
  createdAt    DateTime @default(now())      @map("created_at")

  uploader     User?    @relation(fields: [uploadedBy], references: [id])

  @@map("files")
}
```

### packages/core/db/prisma/schema/garage.prisma

```prisma
// Garage industry tables — only queried when tenant.industry = GARAGE

model GarageCustomer {
  id        String          @id @default(uuid()) @db.Uuid
  tenantId  String          @db.Uuid             @map("tenant_id")
  name      String
  phone     String?
  email     String?
  createdAt DateTime        @default(now())      @map("created_at")

  vehicles  GarageVehicle[]

  @@index([tenantId])
  @@map("garage_customers")
}

model GarageVehicle {
  id           String          @id @default(uuid()) @db.Uuid
  tenantId     String          @db.Uuid             @map("tenant_id")
  customerId   String?         @db.Uuid             @map("customer_id")
  vin          String?
  make         String
  model        String
  year         Int?
  licencePlate String?                              @map("licence_plate")
  createdAt    DateTime        @default(now())      @map("created_at")

  customer     GarageCustomer?  @relation(fields: [customerId], references: [id])
  workOrders   GarageWorkOrder[]

  @@index([tenantId, customerId])
  @@map("garage_vehicles")
}

model GaragePartsInventory {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid             @map("tenant_id")
  sku          String
  name         String
  partNumber   String?                       @map("part_number")
  fitsModel    String?                       @map("fits_model")
  quantity     Int      @default(0)
  reorderPoint Int      @default(5)          @map("reorder_point")
  unitCost     Decimal? @db.Decimal(10, 2)   @map("unit_cost")

  @@unique([tenantId, sku])
  @@index([tenantId])
  @@map("garage_parts_inventory")
}

model GarageWorkOrder {
  id          String          @id @default(uuid()) @db.Uuid
  tenantId    String          @db.Uuid             @map("tenant_id")
  vehicleId   String          @db.Uuid             @map("vehicle_id")
  assignedTo  String?         @db.Uuid             @map("assigned_to")
  status      WorkOrderStatus @default(OPEN)
  description String?
  labourHours Decimal?        @db.Decimal(5, 2)    @map("labour_hours")
  totalCost   Decimal?        @db.Decimal(10, 2)   @map("total_cost")
  openedAt    DateTime        @default(now())      @map("opened_at")
  closedAt    DateTime?                            @map("closed_at")

  vehicle     GarageVehicle   @relation(fields: [vehicleId], references: [id])
  mechanic    User?           @relation("AssignedMechanic", fields: [assignedTo], references: [id])

  @@index([tenantId, status, openedAt])
  @@map("garage_work_orders")
}

model GaragePurchaseOrder {
  id        String              @id @default(uuid()) @db.Uuid
  tenantId  String              @db.Uuid             @map("tenant_id")
  sku       String
  quantity  Int
  urgency   String              @default("standard")
  status    PurchaseOrderStatus @default(PENDING)
  createdAt DateTime            @default(now())      @map("created_at")

  @@index([tenantId, status])
  @@map("garage_purchase_orders")
}
```

### packages/core/db/prisma/schema/clinic.prisma

```prisma
// Clinic industry tables — only queried when tenant.industry = CLINIC

model ClinicPatient {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid             @map("tenant_id")
  medicalRecord String    @unique              @map("medical_record")
  fullName      String                         @map("full_name")
  dateOfBirth   DateTime? @db.Date             @map("date_of_birth")
  allergies     String[]  @default([])
  createdAt     DateTime  @default(now())      @map("created_at")

  appointments  ClinicAppointment[]

  @@index([tenantId])
  @@map("clinic_patients")
}

model ClinicMedication {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid             @map("tenant_id")
  sku          String
  name         String
  dosage       String
  quantity     Int      @default(0)
  reorderPoint Int      @default(20)         @map("reorder_point")
  expiryDate   DateTime @db.Date             @map("expiry_date")
  lotNumber    String?                       @map("lot_number")
  isControlled Boolean  @default(false)      @map("is_controlled")

  @@unique([tenantId, sku, lotNumber])
  @@index([tenantId, expiryDate])
  @@map("clinic_medications")
}

model ClinicAppointment {
  id             String            @id @default(uuid()) @db.Uuid
  tenantId       String            @db.Uuid             @map("tenant_id")
  patientId      String            @db.Uuid             @map("patient_id")
  physicianId    String?           @db.Uuid             @map("physician_id")
  scheduledAt    DateTime                               @map("scheduled_at")
  status         AppointmentStatus @default(SCHEDULED)
  chiefComplaint String?                                @map("chief_complaint")
  notes          String?
  createdAt      DateTime          @default(now())      @map("created_at")

  patient        ClinicPatient     @relation(fields: [patientId], references: [id])
  physician      User?             @relation("AttendingPhysician", fields: [physicianId], references: [id])

  @@index([tenantId, physicianId, scheduledAt])
  @@map("clinic_appointments")
}
```

### packages/core/db/prisma/schema/dealership.prisma

```prisma
// Dealership industry tables — only queried when tenant.industry = DEALERSHIP

model DealerVehicleListing {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid             @map("tenant_id")
  vin         String   @unique
  make        String
  model       String
  year        Int
  mileage     Int?
  askingPrice Decimal? @db.Decimal(12, 2)   @map("asking_price")
  status      String   @default("available")
  createdAt   DateTime @default(now())      @map("created_at")

  deals    DealerSalesDeal[]
  tradeIns DealerTradeIn[]

  @@index([tenantId, status])
  @@map("dealer_vehicle_listings")
}

model DealerSalesDeal {
  id            String               @id @default(uuid()) @db.Uuid
  tenantId      String               @db.Uuid             @map("tenant_id")
  listingId     String               @db.Uuid             @map("listing_id")
  buyerName     String                                    @map("buyer_name")
  salePrice     Decimal?             @db.Decimal(12, 2)   @map("sale_price")
  financingType String?                                   @map("financing_type")
  closedAt      DateTime?                                 @map("closed_at")
  createdAt     DateTime             @default(now())      @map("created_at")

  listing       DealerVehicleListing @relation(fields: [listingId], references: [id])

  @@index([tenantId, closedAt])
  @@map("dealer_sales_deals")
}

model DealerTradeIn {
  id           String                @id @default(uuid()) @db.Uuid
  tenantId     String                @db.Uuid             @map("tenant_id")
  listingId    String?               @db.Uuid             @map("listing_id")
  vin          String
  make         String
  model        String
  year         Int
  offeredValue Decimal?              @db.Decimal(12, 2)   @map("offered_value")
  createdAt    DateTime              @default(now())      @map("created_at")

  listing      DealerVehicleListing? @relation(fields: [listingId], references: [id])

  @@index([tenantId])
  @@map("dealer_trade_ins")
}
```

---

## Database architecture

### Three Neon projects

```
CONTROL_PLANE_DATABASE_URL   → Tenant, McpToken, OAuthClient, TenantInvite only
DATABASE_URL (pool)          → all small/mid tenants — User, TenantMembership,
                               all industry tables, Better Auth tables
WELLCARE_DATABASE_URL        → silo example — identical schema to pool
                               moved from pool via one registry row change
```

### Migration runner

```bash
# 1. Control plane
DATABASE_URL=$CONTROL_PLANE_DATABASE_URL \
DIRECT_DATABASE_URL=$CONTROL_PLANE_DIRECT_URL \
  bunx prisma migrate deploy --config packages/core/db/prisma.config.ts

# 2. Pool
DATABASE_URL=$POOL_DATABASE_URL \
DIRECT_DATABASE_URL=$POOL_DIRECT_URL \
  bunx prisma migrate deploy --config packages/core/db/prisma.config.ts

# 3. Every silo — see scripts/migrate-all.ts
# 4. RLS — see scripts/apply-rls.ts
```

### packages/core/db/prisma/rls.sql

```sql
DO $$ DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users','tenant_memberships','audit_log','files',
    'garage_customers','garage_vehicles','garage_parts_inventory',
    'garage_work_orders','garage_purchase_orders',
    'clinic_patients','clinic_medications','clinic_appointments',
    'dealer_vehicle_listings','dealer_sales_deals','dealer_trade_ins'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_setting(''app.current_tenant'')::uuid)
    ', tbl, tbl);
  END LOOP;
END $$;
```

---

## Critical patterns — NEVER break these

### 1. RLS — Row Level Security

Every business table has RLS enabled. Every transaction MUST start with:

```typescript
await trx.executeQuery(
  sql`SET LOCAL app.current_tenant = ${tenantId}`.compile(trx)
)
```

Use `withTenant()` from `@saas/db` — it wraps this automatically.
NEVER run a query outside `withTenant()` on business tables.
NEVER add `WHERE tenant_id = ?` — RLS handles it.
Exception: INSERT must always set `tenant_id` explicitly.

### 2. Connection router

```typescript
import { withTenant, resolveTenant } from '@saas/db'

const tenant = await resolveTenant(slug)  // Redis cached, 5 min TTL

await withTenant(tenant.id, tenant.connectionKey, async (db) => {
  // pool or silo resolved transparently
  // all queries here are scoped to this tenant
})
```

NEVER call `neon()` or `new Kysely()` outside `packages/core/db/`.

### 3. Service layer — business logic written ONCE

```typescript
// REST route and MCP handler both do this — identical call
const service = new GarageService(db, tenantId)
return service.checkPartStock(sku)
```

NEVER duplicate logic between `routes.ts` and `handlers.ts`.
The service has no knowledge of HTTP, MCP, or queues.

### 4. Own your user UUIDs

Foreign keys point to `users.id` (your UUID), NEVER to `better_auth_id`.
Better Auth is a token issuer. Swapping it only touches `better_auth_id`.

### 5. Prisma for migrations only

```typescript
// WRONG
import { PrismaClient } from '@prisma/client'

// CORRECT
import { withTenant } from '@saas/db'
```

### 6. Industry table isolation

NEVER mix industries in the same table.
NEVER use JSONB attributes to simulate different schemas.

### 7. tenant_id on every INSERT

```typescript
await db.insertInto('garage_work_orders').values({
  id:        crypto.randomUUID(),
  tenant_id: tenantId,  // always explicit on insert
  ...
})
```

---

## Auth (Better Auth)

### Table ownership

Better Auth owns: `user`, `session`, `account`, `verification` — never write directly.
Your platform owns: `users`, `tenant_memberships`, `tenant_invites`.
Linked by: `users.better_auth_id = user.id`.

### Three registration flows

**Flow 1 — Owner self-signup** (`POST /auth/register`):
1. Validate slug available in control plane
2. Create `tenants` row in control plane
3. `auth.api.signUpEmail()` → Better Auth creates `user` + `account`
4. `withTenant()` → create `users` + `tenant_memberships` (role = `owner`)

**Flow 2 — Staff invite** (`POST /auth/invite` → `POST /auth/accept-invite`):
1. Owner invites → `tenant_invites` row created + email with token sent
2. Staff accepts → look up invite → `auth.api.signUpEmail()` → create user + membership
3. Mark invite `accepted_at`

**Flow 3 — SSO auto-provision** (Better Auth `after` hook):
1. SSO user signs in via Google Workspace / Okta
2. `after` hook fires → check if `users` row exists
3. If not → find pending invite → auto-create user + membership → mark invite accepted

### Gateway middleware

Runs on every authenticated request. Derives:
`{ tenantId, tenantSlug, industry, plan, connectionKey, userId, role }`

Call `requirePermission(role, 'resource:action')` at the top of every route and MCP handler.

### RBAC roles

```
Garage:      owner, manager, mechanic, service_advisor
Clinic:      owner, admin, physician, nurse, receptionist
Dealership:  owner, manager, sales, finance
```

### SSO

Per-tenant connections via Better Auth organisation plugin.
Supported: Google Workspace (OIDC), Okta (SAML), Azure AD (SAML).
Offboarding: employer suspends IdP account → next refresh fails → session invalidated.

---

## MCP architecture

### Two endpoints

```
POST /mcp/:tenantSlug           ← built-in copilot (Better Auth session)
POST /mcp/external/:tenantSlug  ← external AI clients (MCP token auth)
```

### Manifest structure

```typescript
// extensions/garage/manifest.ts
{
  name:        'check_part_stock',
  description: 'Get current stock level for a part SKU',
  permission:  'inventory:read',
  approval:    'none',             // 'none' | 'human' | 'human_or_policy'
  plan:        'starter',
  inputSchema: { sku: { type: 'string', required: true } }
}
```

`createMcpServer()` reads manifest → checks tool registry + user permissions →
registers allowed tools with their handlers. Adding a tool = manifest + handlers only.

### Approval policy (enforced in runtime code, not by prompting LLM)

```
none             → fires immediately
human            → always pauses, stages for human confirmation
human_or_policy  → checks tenant policy, auto-approves if allowed, else stages
```

### DCR — RFC 7591 Dynamic Client Registration

`POST /oauth/register` → registers external MCP clients programmatically.
Clients stored in `oauth_clients` (control plane).
After DCR: OAuth 2.0 PKCE flow issues scoped access token per tenant.

---

## Caching

```
Tenant registry       key: tenant:slug:{slug}        TTL: 5 min    — Upstash Redis
Dashboard aggregates  key: tenant:{id}:dash:{metric} TTL: 60 sec   — Upstash Redis
Feature flags         key: tenant:{id}:flags         TTL: 10 min   — Upstash Redis
AI exact-match        key: ai:cache:{hash}           TTL: 5-60 min — Upstash Redis
Rate limit counters   atomic INCR                    per window    — @upstash/ratelimit
Auth sessions         Better Auth / Neon — add Redis only if bottleneck
Row queries           Postgres buffer cache — no Redis for indexed queries
AI semantic cache     pgvector in Neon
```

All Redis keys tenant-namespaced. Cache aggregates, not rows.
Invalidate via Postgres LISTEN/NOTIFY on data change.

---

## Key indexes

```sql
CREATE INDEX ON garage_work_orders      (tenant_id, status, opened_at);
CREATE INDEX ON garage_parts_inventory  (tenant_id, sku);
CREATE INDEX ON garage_vehicles         (tenant_id, customer_id);
CREATE INDEX ON clinic_appointments     (tenant_id, physician_id, scheduled_at);
CREATE INDEX ON clinic_medications      (tenant_id, expiry_date);
CREATE INDEX ON dealer_vehicle_listings (tenant_id, status);
CREATE INDEX ON audit_log               (tenant_id, occurred_at);
```

Every index leads with `tenant_id`.

---

## What NOT to do

```
✗ Never use PrismaClient for queries — Kysely only
✗ Never query business tables without withTenant() active
✗ Never mix industries in the same table
✗ Never use JSONB attributes to avoid proper table design
✗ Never use external auth provider IDs as foreign keys
✗ Never hardcode a DB connection string in app code
✗ Never use tRPC — REST + OpenAPI only
✗ Never build rate limiting manually — use @upstash/ratelimit
✗ Never cache individual DB rows — cache aggregates only
✗ Never let the LLM bypass approval policy — enforce in runtime code
✗ Never run self-managed Kafka — use Upstash Kafka when needed
✗ Never duplicate logic between routes.ts and handlers.ts
✗ Never write to Better Auth tables (user, session, account) directly
✗ Never import across sibling extensions — extensions are independent
```

---

## Build order

Follow this sequence. Do not jump ahead.

```
1.  packages/core/db              connection router, control plane client, Kysely types
2.  packages/core/cache           Upstash Redis, tenant cache, rate limiter
3.  packages/core/auth            Better Auth, gateway middleware, RBAC
4.  core/db/prisma/schema         full multi-file schema, run migrations, run rls.sql
5.  Registration routes           owner signup, staff invite, accept-invite, SSO hook
6.  packages/extensions/garage    manifest, service, routes, handlers (first industry)
7.  packages/apps/api             mount garage routes, verify full REST request end-to-end
8.  packages/apps/mcp             server host, tool registry, garage MCP tools working
9.  MCP DCR + OAuth               external client registration + PKCE flow
10. packages/extensions/clinic    second industry — proves the extension pattern scales
11. packages/apps/worker          notifications, RAG indexer, billing meter
12. packages/lib/storage          GCS client, file upload routes
13. packages/extensions/dealer    third industry
14. packages/lib/llm              LLM calls, prompt caching, AI audit log
15. packages/apps/web             SvelteKit — only after API is solid
```

---

## Environment variables

```bash
# Neon — control plane
CONTROL_PLANE_DATABASE_URL=
CONTROL_PLANE_DIRECT_URL=

# Neon — pool
DATABASE_URL=
DIRECT_DATABASE_URL=

# Neon — silos (add per enterprise tenant onboarded)
WELLCARE_DATABASE_URL=
WELLCARE_DIRECT_URL=

# Upstash
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Google OAuth (personal + Workspace SSO)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Cloud Storage
GCS_BUCKET_NAME=
GCS_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

# Anthropic
ANTHROPIC_API_KEY=

# Ports
API_PORT=3000
MCP_PORT=3001
WORKER_PORT=3002
NODE_ENV=development
```

---

## Root package.json

```json
{
  "name": "my-saas",
  "private": true,
  "workspaces": [
    "packages/**"
  ],
  "scripts": {
    "dev":          "bun run --parallel dev:api dev:mcp dev:worker",
    "dev:api":      "cd packages/apps/api    && bun --watch index.ts",
    "dev:mcp":      "cd packages/apps/mcp    && bun --watch index.ts",
    "dev:worker":   "cd packages/apps/worker && bun --watch index.ts",
    "db:generate":  "bunx prisma generate --config packages/core/db/prisma.config.ts",
    "db:migrate":   "bun run scripts/migrate-all.ts",
    "db:rls":       "bun run scripts/apply-rls.ts"
  },
  "devDependencies": {
    "typescript": "latest",
    "bun-types":  "latest"
  }
}
```
