# Light Story

[![light-story-ci](https://github.com/Heizdoobert/Light-Story/actions/workflows/ci.yml/badge.svg)](https://github.com/Heizdoobert/Light-Story/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/Heizdoobert/Light-Story/releases)

Light Story is an online reading platform with a Next.js frontend, Supabase backend, and Cloudflare Workers backend (D1 + R2). Includes a comic platform with semantic search, VIP content gating, real-time updates, and a fully decoupled API Gateway architecture.

## Quick Links

| Area | Document |
|---|---|
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Testing | [docs/TESTING.md](docs/TESTING.md) |
| Real Data Setup | [docs/REAL_DATA.md](docs/REAL_DATA.md) |
| Staging Runbook | [docs/STAGING_RUNBOOK.md](docs/STAGING_RUNBOOK.md) |
| Worker Deployment | [docs/WORKERS_DEPLOYMENT.md](docs/WORKERS_DEPLOYMENT.md) |
| Frontend Architecture | [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) |
| API Gateway | [workers/api-gateway/README.md](workers/api-gateway/README.md) |
| Backend D1 SaaS | [backend-d1-saas/README.md](backend-d1-saas/README.md) |
| Supabase Schema | [backend-supabase/docs/db-schema.md](backend-supabase/docs/db-schema.md) |
| Edge Functions | [docs/DEPLOY_EDGE_FUNCTIONS.md](docs/DEPLOY_EDGE_FUNCTIONS.md) |
| Env Reference | [Instruction_create_key.md](Instruction_create_key.md) |
| API Test Spec | [API_test.md](API_test.md) |

## Repository Layout

```text
packages/
  api-types/              OpenAPI spec + generated TS types (shared contract)
frontend/                 Next.js application (pure presentation)
workers/
  api-gateway/            API Gateway Worker — JWT, CORS, routing
  comics-worker/          Comic/chapter CRUD on D1
  stories-worker/         Story CRUD on D1
  analytics-worker/       Dashboard analytics aggregation
  admin-worker/           Admin operations, audit logs
  r2-proxy/               JWT-gated R2 asset proxy
backend-supabase/         Supabase migrations, functions, tests, and docs
backend-d1-saas/          Monolithic D1 SaaS backend (legacy, being migrated)
docs/                     Canonical architecture, testing, deployment docs
```

## Local Development

```bash
npm --prefix packages/api-types run generate   # Generate TS types from OpenAPI spec
npm --prefix frontend install
npm --prefix frontend run dev                  # Next.js on port 3001

# Workers (each in its own terminal)
npm --prefix workers/api-gateway run dev       # Gateway on port 8787
npm --prefix workers/comics-worker run dev     # Domain workers on separate ports

# Supabase
cd backend-supabase
supabase start                                 # Local Supabase on port 54321
```

## Platform Features

- **Semantic Search**: Vector-based search using pgvector (1536-dimensional embeddings)
- **VIP Content Gating**: Row-level security policies protect premium chapters
- **Real-time Updates**: Supabase Realtime subscriptions for live chapter changes
- **Edge Functions**: Serverless webhooks for payments and rewards
- **Asset Proxy**: Cloudflare R2 with JWT + HMAC signed URL access control
- **Role-based Access**: Admin panel for content management (superadmin, admin, employee, user)
- **API Gateway**: Single entry point with JWT validation, rate limiting, and strict CORS

## Runtime Notes

- Use `NEXT_PUBLIC_*` variables in the browser; keep secrets server-side.
- Internal admin routes live under `/api/internal/admin/*` (being migrated to `/api/v1/*`).
- Workers use service bindings for inter-worker communication (no public DNS between them).

## Canonical Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/REAL_DATA.md](docs/REAL_DATA.md)
- [docs/STAGING_RUNBOOK.md](docs/STAGING_RUNBOOK.md)
- [docs/WORKERS_DEPLOYMENT.md](docs/WORKERS_DEPLOYMENT.md)


