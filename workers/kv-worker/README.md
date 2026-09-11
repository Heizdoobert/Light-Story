# Unified API Gateway — Cloudflare Worker `kv-worker`

The single Cloudflare Worker serving the whole Light Story API. Deployed under the **worker name `kv-worker`** (legacy name kept for deployment continuity), it consolidates what were previously 5 separate Workers (`api-gateway`, `stories-worker`, `comics-worker`, `admin-worker`, `analytics-worker`) into one deployment with modular route handlers and shared middleware.

## Topology

```
kv-worker (wrangler.jsonc, src/index.ts)
├── middleware/
│   ├── auth.ts               # JWT validation (JWKS from Supabase)
│   ├── cors.ts               # Origin allow-list + /supabase proxy
│   ├── rateLimit.ts          # KV-backed rate limiting
│   └── securityHeaders.ts    # Security headers on every response
├── routes/
│   ├── stories.ts            # /api/stories, /api/chapters
│   ├── comics.ts             # /api/comics
│   ├── admin.ts              # /api/admin/* (privileged)
│   ├── analytics.ts          # /api/analytics/* (Analytics Engine)
│   ├── user.ts               # /api/user
│   └── hyperdrive.ts         # /api/hyperdrive/* (Postgres proxy)
└── utils/
    ├── supabase-client.ts    # Shared Supabase REST client + helpers
    ├── encryption.ts         # ENC key helpers
    └── validation.ts
```

Also exports `LightStoryWorkflow` (Workflows entrypoint) and a `queue()` consumer (Queues → KV invalidation / analytics / audit logs).

## Bindings (`wrangler.jsonc`)

| Binding | Type | Purpose |
|---|---|---|
| `R2_BUCKET` | R2 bucket `comic` | Covers & chapters media |
| `APP_KV`, `COMIC_METADATA` | KV namespaces | Cache / metadata |
| `LIGHTSTORY_QUEUE` | Queue `lightstory-queue` | Background processing (analytics, audit, cache invalidation) |
| `LIGHTSTORY_WORKFLOW` | Workflow `lightstory-workflow` | Durable execution |
| `HYPERDRIVE` | Hyperdrive | Postgres proxy to Supabase |
| `ANALYTICS_DATA` | Analytics Engine `lightstory_analytics` | Analytics events |

## Routes

All API routes are mounted under `/api/*`. Public health endpoint: `GET /api/health`.

| Route | Handler | Notes |
|---|---|---|
| `GET /api/health` | index.ts | Health check (used by compose healthcheck + CI smoke test) |
| `/api/stories`, `/api/chapters` | stories.ts | Novel & chapter domain |
| `/api/comics` | comics.ts | Comic domain |
| `/api/admin/*`, `/api/auth/*` | admin.ts / auth path | Privileged ops, JWT-gated |
| `/api/analytics/*` | analytics.ts | Metrics aggregation |
| `/api/user` | user.ts | User profile / history |
| `/api/hyperdrive/*` | hyperdrive.ts | Postgres-backed proxy routes |
| `/supabase/*` | index.ts proxy | Passthrough proxy to Supabase REST (anon key injected, CORS applied) |

## Environment Variables (vars / secrets)

Set via `wrangler.jsonc` `vars`, `.dev.vars` (local), or `wrangler secret put` (production secrets):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Supabase REST client credentials
- `SUPABASE_JWKS_URL` — JWKS endpoint for JWT validation
- `ENC_KEY` — AES-256-GCM key for content field encryption (≥32 chars; generate with `openssl rand -base64 32`)
- `USE_NEW_UNIFIED_GATEWAY` — feature flag (`true`; legacy 5-worker path is retired)
- `CLOUDFLARE_ACCOUNT_ID` — set in `vars` for account-context operations

## Development

```bash
# From repo root — runs wrangler dev with remote bindings on :8787
npm run dev:gateway

# Local-only smoke checks
curl http://localhost:8787/api/health
```

## Production Deployment

```bash
# Manual deploy from repo root (uses wrangler.jsonc)
npm run deploy
```

Automatic deploy: push to `main` → `.github/workflows/production.yml` runs lint/typecheck/build/test, then `wrangler deploy --config workers/kv-worker/wrangler.jsonc` (secret `CLOUDFLARE_API_TOKEN`), then `supabase db push --include-all`, then a smoke test against `https://kv-worker.hhhuygiau.workers.dev/api/stories`.

### Routes (wrangler `env`)

| Env | Route |
|---|---|
| `production` | `api.lightstory.app/*` (zone `lightstory.app`) |
| `staging` | `api-staging.lightstory.app/*` |

Workers-dev preview URL: `https://kv-worker.hhhuygiau.workers.dev` — this URL is the hardcoded fallback in the frontend gateway URL contract (see `docs/decisions/ADR-001-gateway-url-fallback.md`).

## Observability

`observability.enabled: true` with head sampling 1: logs and invocation logs are persisted to Workers Logs. Analytics events go to the `lightstory_analytics` Analytics Engine dataset.

## Rollback

Roll back to a previous deployment with:

```bash
wrangler rollback --config workers/kv-worker/wrangler.jsonc
```

The old 5-worker fleet is retired and **not** available for rollback; any revert is within this single Worker's deployment history.
