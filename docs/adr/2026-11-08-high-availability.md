# ADR 002 – High Availability & Distributed Counter Architecture

## Status
Accepted

## Date
2026-11-08

## Context
High traffic on popular stories was causing excessive write amplification and row-lock contention on the primary Supabase database when updating view counts directly per request. Furthermore, edge latency varied significantly across global regions without multi-replica routing.

To achieve high availability (HA), sub-millisecond view tracking, and edge fault-tolerance:
1. Traffic needed to be routed to the nearest regional Supabase replica (EU, US, or default fallback) based on Cloudflare edge telemetry (`CF-Region` header / `cf.region`).
2. High-frequency view counts needed an edge buffer (Cloudflare Workers KV) to decouple edge traffic from transactional database updates.
3. A reliable scheduled synchronization mechanism was required to periodically flush buffered counts to the database via stored procedures (`scripts/redis_sync.ts`).
4. API contracts and OpenAPI specifications required strict alignment, including uniform `{id}` path parameters, proper HTTP 204 No Content semantics for fire-and-forget view updates, and authorization/role enforcement via `requireActionRole`.

## Decisions

### 1. Multi-Region Edge Routing
- `workers/kv-worker` inspects `CF-Region` header and `(request as any).cf?.region` to select the nearest Supabase replica (`SUPABASE_URL_EU`, `SUPABASE_URL_US`, or `SUPABASE_URL`).
- Sets `(globalThis as any).SUPABASE_URL` to ensure all downstream client utilities (`sbGet`, `sbPost`, `sb`, `sbAdminGet`, and route handlers) seamlessly direct queries to the optimal regional replica.

### 2. Edge KV View Counters with Best-Effort Sync
- `incrementStoryView` increments counts in `env.APP_KV` using key pattern `view:${storyId}`.
- When a counter exceeds the batch threshold (1,000 views), an immediate RPC call to `increment_story_views` is made to Supabase, and the KV counter is reset to `0`.
- Handlers return `HTTP 204 No Content` to reduce payload overhead, while direct internal calls return structured JSON `{ success: true, count }`.

### 3. Scheduled Cron Sync
- A Cloudflare Cron Trigger `0 2 * * *` in `wrangler.toml` and `wrangler.jsonc` executes `scripts/redis_sync.ts` daily.
- Iterates over all `view:*` keys in `APP_KV`, invokes `increment_story_views` RPC with aggregated counts, and purges synced KV keys.

### 4. API Specification & Security Alignment
- Standardized all OpenAPI path parameters to `{id}` (e.g., `/stories/{id}`, `/stories/{id}/view`, `/chapters/{id}`).
- Added `requireActionRole` guard on `/api/v1/stories/{id}/view` enforcing valid user/admin roles before mutating view state.

### 5. Monorepo Unified Test Pipeline
- Root `package.json` test script updated to `"npm --prefix frontend run test:run && npm --prefix workers/kv-worker test"` ensuring full coverage across frontend tiers and edge worker suites.

## Consequences
- **Positive**: Eliminates database write bottlenecks during viral traffic spikes; cuts edge read latencies in EU and US regions; standardizes API contract naming and status codes.
- **Negative**: View count propagation to the database is eventually consistent (buffered in KV until threshold or cron trigger).
