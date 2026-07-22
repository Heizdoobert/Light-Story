# Workers Deployment Guide

Comprehensive deployment and management guide for all Cloudflare Workers in the Light Story platform.

## Worker Overview

| Worker | Directory | Purpose | Public Route |
|---|---|---|---|
| **api-gateway** | `workers/api-gateway/` | JWT validation, CORS, rate limiting, request routing | `https://api.lightstory.workers.dev/api/v1/*` |
| **comics-worker** | `workers/comics-worker/` | Comic/chapter CRUD on D1 | Internal (service binding) |
| **stories-worker** | `workers/stories-worker/` | Story CRUD on D1 | Internal (service binding) |
| **analytics-worker** | `workers/analytics-worker/` | Dashboard analytics aggregation | Internal (service binding) |
| **admin-worker** | `workers/admin-worker/` | Admin operations, audit logs | Internal (service binding) |
| **lightstory-r2-proxy** | `workers/r2-signed-url/` | JWT + HMAC-gated R2 asset proxy | `https://assets.lightstory.workers.dev/*` |

## Architecture

```
                    ┌──────────────┐
  Client ──────────►│ api-gateway  │
                    └──┬───┬───┬───┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        comics-worker  stories-worker  admin-worker
              │            │            │
              ▼            ▼            ▼
             D1           D1           D1
```

Workers behind the gateway use **service bindings** — they are never exposed to the public internet directly. Only the gateway and R2 proxy have public URLs.

## Prerequisites

- Wrangler CLI: `npm install -g wrangler`
- Authenticated: `npx wrangler login`
- Node.js 18+

## Deploying Individual Workers

### 1. API Gateway (`workers/api-gateway/`)

**Config:** `wrangler.jsonc` — service bindings to domain workers, JWKS URL for JWT verification.

```bash
cd workers/api-gateway

# Set secrets (required for production)
npx wrangler secret put SUPABASE_JWKS_URL
# Value: https://<project>.supabase.co/.well-known/jwks.json

# Deploy
npx wrangler deploy
```

**Service bindings** in `wrangler.jsonc` must point to deployed domain workers:

```json
{
  "services": [
    { "binding": "COMICS_WORKER", "service": "comics-worker" },
    { "binding": "STORIES_WORKER", "service": "stories-worker" },
    { "binding": "ANALYTICS_WORKER", "service": "analytics-worker" },
    { "binding": "ADMIN_WORKER", "service": "admin-worker" },
    { "binding": "R2_PROXY", "service": "lightstory-r2-proxy" }
  ]
}
```

**Route table** (routes handled by the gateway):

| Public Path | Target Binding |
|---|---|
| `/api/v1/comics/*` | `COMICS_WORKER` |
| `/api/v1/stories/*` | `STORIES_WORKER` |
| `/api/v1/admin/*` | `ADMIN_WORKER` |
| `/api/v1/analytics/*` | `ANALYTICS_WORKER` |
| `/api/v1/assets/*` | `R2_PROXY` |
| `/api/v1/health` | Inline response |

### 2. Comics Worker (`workers/comics-worker/`)

**Config:** `wrangler.jsonc` — D1 binding for comic data.

```bash
cd workers/comics-worker

# Create D1 database (first time only)
npx wrangler d1 create comics-db
# Add the binding to wrangler.jsonc

# Apply migrations
npx wrangler d1 migrations apply comics-db

# Deploy
npx wrangler deploy
```

**D1 binding:**
```json
{
  "d1_databases": [
    { "binding": "COMICS_DB", "database_name": "comics-db", "database_id": "<id>" }
  ]
}
```

### 3. Stories Worker (`workers/stories-worker/`)

Same pattern as comics-worker but for story CRUD.

```bash
cd workers/stories-worker
npx wrangler d1 create stories-db
npx wrangler d1 migrations apply stories-db
npx wrangler deploy
```

### 4. Analytics Worker (`workers/analytics-worker/`)

```bash
cd workers/analytics-worker
npx wrangler d1 create analytics-db
npx wrangler d1 migrations apply analytics-db
npx wrangler deploy
```

### 5. Admin Worker (`workers/admin-worker/`)

```bash
cd workers/admin-worker
npx wrangler d1 create admin-db
npx wrangler d1 migrations apply admin-db
npx wrangler deploy
```

### 6. R2 Proxy (`workers/r2-signed-url/`)

**Config:** `wrangler.toml` — R2 bucket binding, KV namespace for token cache.

```bash
cd workers/r2-signed-url

# Set secrets
npx wrangler secret put ASSETS_SIGN_SECRET
# Value: <random-hex-string>

# Deploy
npx wrangler deploy
```

**Bindings:**
```toml
[r2_buckets]
binding = "ASSETS_BUCKET"
bucket_name = "lightstory-assets"

[[kv_namespaces]]
binding = "KV"
```

## Full Deployment Sequence

Deploy workers in dependency order (domain workers first, gateway last):

```powershell
# 1. Domain workers (can be parallel)
cd workers/comics-worker; npx wrangler deploy; cd ../..
cd workers/stories-worker; npx wrangler deploy; cd ../..
cd workers/analytics-worker; npx wrangler deploy; cd ../..
cd workers/admin-worker; npx wrangler deploy; cd ../..

# 2. R2 proxy
cd workers/r2-signed-url; npx wrangler deploy; cd ../..

# 3. API Gateway (last — needs service bindings for all workers above)
cd workers/api-gateway; npx wrangler deploy; cd ../..
```

## Environment-Specific Deployments

Use `--env` for staging/preview:

```bash
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

Each env can have separate secrets and bindings. Create `wrangler.staging.jsonc` or use `[env.staging]` in `wrangler.jsonc`.

## Secrets Management

| Worker | Secret | Source |
|---|---|---|
| api-gateway | `SUPABASE_JWKS_URL` | `https://<project>.supabase.co/.well-known/jwks.json` |
| r2-proxy | `ASSETS_SIGN_SECRET` | Generated via `openssl rand -hex 32` |
| comics-worker | D1 binding | Created via `npx wrangler d1 create` |
| (all workers) | `CF_ACCOUNT_ID` | Cloudflare dashboard → Workers → Account ID |

## Health Checks

After deployment, verify each worker:

```bash
# Gateway (public)
curl https://api-gateway.<account>.workers.dev/api/v1/health
# → { "status": "ok", "service": "api-gateway" }

# R2 proxy (public)
curl -I https://assets.lightstory.workers.dev/public/test.txt
# → 200 with Cache-Control header

# Domain workers (via gateway only — no public access)
curl -H "Authorization: Bearer <jwt>" https://api-gateway.<account>.workers.dev/api/v1/comics
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Gateway returns 502 | Service binding misconfigured | Verify worker names match in `wrangler.jsonc`, redeploy gateway |
| Gateway returns 401 on valid JWT | JWKS URL wrong or unreachable | Check `SUPABASE_JWKS_URL` secret, verify Supabase project is accessible |
| R2 proxy returns 403 for public assets | Key path doesn't match routing | Ensure public assets don't have `vip/` prefix |
| Domain worker returns 500 | D1 database not provisioned | Run `npx wrangler d1 migrations apply` |
| Cold start latency | Worker memory / code size | Keep each worker < 300 lines, use `compatibility_flags: ["nodejs_compat"]` |

## Observability

```bash
# Tail logs
npx wrangler tail

# Check deployment history
npx wrangler deployments list

# View metrics
npx wrangler metrics
```

All workers have `"observability": { "enabled": true }` in their `wrangler.jsonc` for Cloudflare dashboard monitoring.
