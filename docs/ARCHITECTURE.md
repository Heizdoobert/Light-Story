# Light Story Architecture Standard

## Purpose

This is the canonical repository-wide reference for how Light Story code is organized and how new work should be introduced.

## Layering Rules

- Dependencies point inward only.
- Domain code contains business rules and pure types.
- Application code orchestrates use cases, DTOs, and validation.
- Infrastructure code adapts external systems behind interfaces.
- Presentation code handles transport, routing, and response shaping only.

## Repository Layout

### Frontend

- `frontend/src/shared/core` holds base abstractions such as `BaseService`, `BaseRepository`, `DomainError`, `GlobalExceptionHandler`, `Logger`, and `Result`.
- `frontend/src/domain` contains entities and repository interfaces.
- `frontend/src/application` contains DTOs and use cases.
- `frontend/src/infrastructure` contains Supabase adapters and other external integrations.
- `frontend/src/presentation` and `frontend/src/app` handle UI and API entry points.
- `frontend/src/services/analytics.service.ts` reads `CLOUDFLARE_ANALYTICS_WORKER_URL` for infrastructure analytics data and must stay browser-safe.

### Backend D1 SaaS (Legacy)

> **⚠️ LEGACY:** This monolithic Worker is being replaced by decoupled domain workers under `workers/`. See the Cloudflare Workers section below and `plan_FEBE.md`.

- `backend-d1-saas/src/shared/core` holds shared runtime utilities, error handling, logging, and result helpers.
- `backend-d1-saas/src` organizes worker handlers, provisioning flows, and tenant operations.

### Backend Supabase

- `backend-supabase/supabase/functions` contains deployed function handlers and their shared helpers.
- `backend-supabase/supabase/migrations` owns schema changes.
- `backend-supabase/docs` captures database and policy notes.
- `backend-supabase/workers/analytics-aggregator.ts` is the Cloudflare Worker that powers the analytics dashboard's infrastructure metrics endpoint.

### Comic Platform (New)

- **Migration**: `backend-supabase/supabase/migrations/202605100001_comic_platform.sql`
  - Core schema: `stories`, `chapters` with pgvector embeddings (1536-dim)
  - RLS policies: `read_published_stories`, `read_free_chapters`, `read_vip_chapters_premium_admin`
  - Search RPC: `search_stories(query_embedding, match_count)`
  - Index: `idx_stories_search_vector` using ivfflat

- **Edge Function**: `backend-supabase/supabase/functions/payment_and_rewards/index.ts`
  - Handles `payment_webhook` and `daily_checkin` events
  - RPC calls to grant rewards and record payments
  - Minimal JSON parsing with defensive error handling

- **R2 Worker**: `workers/r2-signed-url/worker.js`
  - JWT-based asset access control
  - Role check: `premium` and `admin` bypass VIP gating
  - Cache headers: `private` for VIP, `public` for public assets
  - Signature validation for webhook payloads

- **Embedding Backfill**: `backend-supabase/supabase/scripts/backfill_embeddings.js`
  - Batch embedding generation using OpenAI API (optional)
  - Upserts embeddings via Supabase service role
  - Continues until all rows processed

- **Tests**: `backend-supabase/supabase/tests/`
  - `rls-policies.test.sql`: RLS policy validation
  - `payment_and_rewards.test.ts`: Edge Function handler tests
  - `worker.test.js`: R2 Worker JWT and gating tests

### Cloudflare Workers (Decoupled Architecture)

Light Story migrated from a monolithic `backend-d1-saas/` Worker to a gateway-driven domain worker architecture. All workers use **ES modules syntax** with `wrangler.jsonc` config.

#### Routing Table

| Worker | Type | Public URL | Purpose |
|--------|------|-----------|---------|
| `workers/api-gateway/` | Gateway | Yes (`api.*`) | JWT validation, routing, header injection |
| `workers/comics-worker/` | Domain | No (service binding only) | Comic CRUD, chapters, reading progress |
| `workers/stories-worker/` | Domain | No (service binding only) | Story CRUD, search, recommendations |
| `workers/analytics-worker/` | Domain | No (service binding only) | Page views, reading stats, dashboard metrics |
| `workers/admin-worker/` | Domain | No (service binding only) | Moderation, content management, user mgmt |
| `workers/r2-signed-url/` | Proxy | Yes (`assets.*`) | Signed asset URLs, role-based gating |

#### Data Flow

```
Browser/Frontend
     │
     ▼  (public URL)
api-gateway ──► JWT validation (auth.ts)
     │
     ├── service binding ──► comics-worker ──► D1 (comics)
     ├── service binding ──► stories-worker ──► D1 (stories)
     ├── service binding ──► analytics-worker ──► D1 (analytics)
     └── service binding ──► admin-worker ──► D1 (admin)

assets.*
     └── r2-signed-url ──► R2 (assets) + JWT role check
```

#### Worker Responsibilities

- **API Gateway** (`workers/api-gateway/`): Single entry point for all frontend API requests. Validates JWTs via `auth.ts`, injects `x-user-id` and `x-user-role` headers, routes to the appropriate domain worker via service bindings. Handles CORS at the edge.
- **Domain Workers** (`workers/*-worker/`): Each owns a distinct D1 database and exposes domain-specific REST endpoints. Read authenticated user info from injected headers (never re-parse JWTs).
- **R2 Proxy** (`workers/r2-signed-url/`): Handles asset delivery with role-based access control. `premium` and `admin` roles bypass VIP gating. Sets `Cache-Control: public` for public assets, `private` for VIP content.

#### Service Binding Configuration (`wrangler.jsonc`)

```jsonc
{
  "name": "api-gateway",
  "main": "src/index.ts",
  "workers": [
    { "binding": "comics",       "service": "comics-worker" },
    { "binding": "stories",      "service": "stories-worker" },
    { "binding": "analytics",    "service": "analytics-worker" },
    { "binding": "admin",        "service": "admin-worker" }
  ]
}
```

#### Legacy Worker

- `backend-d1-saas/` — monolithic Worker now treated as **legacy/reference**. All new development goes into the domain workers above. Migration tracking is in `plan_FEBE.md`.

## Standard Practices

- New features start as a use case, not as direct route logic.
- Repositories must be injectable and must not leak transport concerns.
- Validate request payloads before business logic executes.
- Use `DomainError` subclasses for known failures.
- Use `GlobalExceptionHandler` or equivalent transport middleware to map errors to safe responses.
- Include a request trace id in every error response.
- Keep code style and naming consistent with the surrounding layer.

## Validation Expectations

- Keep layer imports pointed inward.
- Avoid direct database or storage access outside infrastructure code.
- Prefer small, testable changes over broad refactors.
- Verify new code with the narrowest relevant check before widening scope.

## Reference Docs

- `plan_FEBE.md` — active migration blueprint (supersedes `ARCHITECTURE_BLUEPRINT_CLEANUP_2026-05-10.md`)
- `frontend/ARCHITECTURE.md` (legacy pointer)
- `docs/WORKERS_DEPLOYMENT.md` — deployment guide for all 6 Cloudflare Workers
- `agent/OUTPUTS/TechLead_architecture_blueprint.md`
- `agent/OUTPUTS/Developer_code_templates.md`
- `agent/OUTPUTS/Tester_architecture_validation.md`
- `agent/OUTPUTS/CrossCheck_comprehensive_review.md`
