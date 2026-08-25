# Light Story — Production Engine & Platform Documentation

[![Build & Test](https://github.com/Heizdoobert/Light-Story/actions/workflows/ci.yml/badge.svg)](https://github.com/Heizdoobert/Light-Story/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black.svg)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020.svg)](https://workers.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20pgvector-3ECF8E.svg)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Light Story** is an enterprise-grade, high-performance digital publishing platform for web comics and web novels. Designed for sub-second page loads, global edge delivery, and secure digital asset protection, Light Story combines a modern Next.js 16 App Router frontend with a single unified API Gateway running as a Cloudflare Worker and a Supabase (PostgreSQL + `pgvector`) data layer.

---

## 📋 Table of Contents

- [Architectural Topology](#-architectural-topology)
- [Core Platform Capabilities](#-core-platform-capabilities)
- [Repository Structure](#-repository-structure)
- [Technology Stack](#-technology-stack)
- [Quick Links & Documentation](#-quick-links--documentation)
- [Environment Configuration](#-environment-configuration)
- [Local Development Setup](#-local-development-setup)
- [Production & Docker Deployment](#-production--docker-deployment)
- [Security & Access Control](#-security--access-control)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🏗 Architectural Topology

Light Story employs a decoupled, edge-first architecture. All API traffic passes through a **Unified API Gateway** (deployed as the Cloudflare Worker `kv-worker`) on Cloudflare's global edge network before routing to domain route handlers or Supabase.

```mermaid
graph TD
    User["Client Browser / Web App"] -->|HTTPS / Next.js 16| Frontend["Frontend Server (Next.js Standalone)"]
    User -->|Direct API / REST| Gateway["Unified API Gateway (Worker kv-worker)"]
    Frontend -->|Internal / Edge Fetch| Gateway

    subgraph Edge Layer [Cloudflare Workers Network]
        Gateway -->|JWT / CORS / Rate Limit| Router["Worker Router & Middleware"]
        Router --> Stories["/stories, /chapters"]
        Router --> Comics["/comics"]
        Router --> Admin["/admin (Privileged)"]
        Router --> Analytics["/analytics (Metrics)"]
        Router --> User["/user"]
        Router --> Hyperdrive["/hyperdrive (Postgres proxy)"]
    end

    subgraph Data & Media Layer
        Gateway -->|Supabase REST / RLS| Supabase["Supabase DB (pgvector + RLS)"]
        Gateway -->|KV / Queues / Workflows| CFState["Cloudflare KV · Queues · Workflows"]
        Gateway -->|Hyperdrive| Supabase
        Gateway -->|Signed Bucket Access| R2["Cloudflare R2 Bucket (Covers & Chapters)"]
    end
```

Key facts about the current topology:

- **One Worker, not five.** The Phase-1 fleet (`api-gateway`, `stories-worker`, `comics-worker`, `admin-worker`, `analytics-worker`) was consolidated into the single `kv-worker` — see [workers/kv-worker/README.md](workers/kv-worker/README.md).
- **Production route**: `api.lightstory.app/*` (zone `lightstory.app`). **Staging route**: `api-staging.lightstory.app/*`.
- **Gateway URL contract** (fallback chain) is documented in [ADR-001](docs/decisions/ADR-001-gateway-url-fallback.md).

---

## ✨ Core Platform Capabilities

- 🎨 **Next-Gen Reader Interface**: Optimized image pagination, CBZ comic package extraction, pre-fetching, and responsive layout scaling.
- 🔍 **AI Semantic Search**: Vector-based content discovery utilizing Supabase `pgvector` with 1536-dimensional embeddings.
- 🔐 **Secure Media Distribution**: Cloudflare R2 bucket protection with short-lived HMAC & JWT signed URLs to prevent hotlinking and pirating.
- 🛡 **Role-Based Access Control (RBAC)**: Multi-tiered access policies (`superadmin`, `admin`, `employee`, `user`) enforced via database Row-Level Security (RLS).
- ⚡ **Edge API Gateway**: Central entry point managing JWT validation, CORS, rate limiting, and request normalization.
- 📊 **Real-time Analytics**: Aggregated view counts, reading history, and user engagement dashboards.

---

## 📁 Repository Structure

```text
Light-Story/
├── frontend/                     # Next.js 16 App Router application (Presentation Layer)
│   ├── src/app/                  # Pages, layouts, and API proxies
│   ├── src/components/           # Reusable UI components (Tailwind CSS v4, Lucide)
│   └── ARCHITECTURE.md           # Frontend architecture documentation
├── packages/
│   ├── api-types/                # OpenAPI 3.0 spec & auto-generated TypeScript contracts
│   └── mcp-lightstory/           # MCP server tooling (internal)
├── workers/
│   └── kv-worker/                # Unified API Gateway (JWT auth, CORS, routing) — the only Worker
├── backend-supabase/             # Database layer & Supabase migrations
│   ├── supabase/                 # migrations/, scripts/, snippets/, tests/, config.toml
│   └── docs/                     # Database schema, RLS, and storage documentation
├── Dockerfile                    # Unified single-container image (postgres + gateway + frontend)
├── Dockerfile.frontend           # Frontend-only production image (standalone build)
├── docker-compose.yml            # Local & staging container orchestrator
├── docs/decisions/               # Architecture Decision Records (ADR-001, …)
└── Instruction_create_key.md     # Production environment variable reference
```

---

## 🛠 Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | High-performance SSR & ISR web interface |
| **Styling** | Tailwind CSS v4, Lucide React, Shadcn UI | Modern responsive glassmorphic design system |
| **API Gateway** | Cloudflare Worker (`kv-worker`), Hono / Wrangler | Global edge API routing, JWT verification, rate limiting |
| **Edge State** | Cloudflare KV, Queues, Workflows, Hyperdrive | Caching, background jobs, Postgres proxying |
| **Primary Database** | Supabase (PostgreSQL 15+) | Transactional data store with RLS and triggers |
| **Vector Search** | Supabase `pgvector` | 1536-dim vector embeddings for similarity search |
| **Media Storage** | Cloudflare R2 | S3-compatible asset storage for covers & chapters |
| **Containerization** | Docker, Docker Compose | Multi-stage container builds using `node:22-slim` |

---

## 📚 Quick Links & Documentation

| Document | Description |
|---|---|
| [Unified Gateway Guide](workers/kv-worker/README.md) | Gateway routes, bindings, and deployment for the API Gateway Worker |
| [Frontend Architecture](frontend/ARCHITECTURE.md) | Next.js directory structure, client state, and rendering strategies |
| [Database Schema Docs](backend-supabase/docs/db-schema.md) | PostgreSQL tables, foreign keys, enums, and indexes |
| [Row-Level Security (RLS)](backend-supabase/docs/rls-policies.md) | Access control matrices and row security definitions |
| [Storage Configuration](backend-supabase/docs/storage.md) | R2 bucket setup and media folder conventions |
| [Environment Variable Guide](Instruction_create_key.md) | Exhaustive list of required production and staging `.env` keys |
| [Docker Deployment Guide](README.Docker.md) | Container orchestration and cloud container runtime guide |
| [Gateway URL Fallback (ADR-001)](docs/decisions/ADR-001-gateway-url-fallback.md) | Production gateway URL resolution contract |

---

## 🔑 Environment Configuration

Light Story uses environment variable validation across services. Create `.env` in the root directory — the frontend auto-imports the keys it needs into `frontend/.env.local` via `frontend/scripts/import_root_env.mjs`. See [.env.example](.env.example) and [Instruction_create_key.md](Instruction_create_key.md) for the full reference.

### Essential Production Variables

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_token_here
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_token_here

# Gateway & Worker Endpoints
NEXT_PUBLIC_GATEWAY_URL=https://api.lightstory.app
NEXT_PUBLIC_GATEWAY_URL_PRODUCTION=https://kv-worker.hhhuygiau.workers.dev
JWT_SECRET=your-production-jwt-secret-key

# Cloudflare R2 Storage (single bucket `comic`, key-prefix separated)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
NEXT_PUBLIC_R2_BUCKET_COVERS=comic
NEXT_PUBLIC_R2_BUCKET_CHAPTERS=comic

# Internal Admin API (all three must match)
INTERNAL_ADMIN_SECRET=<random-hex>
NEXT_PUBLIC_INTERNAL_ADMIN_SECRET=<same-random-hex>
ADMIN_API_KEY=<same-random-hex>
```

> **Gateway URL contract**: in production the gateway URL resolves via `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` → `NEXT_PUBLIC_GATEWAY_URL` → hardcoded worker domain fallback. See [ADR-001](docs/decisions/ADR-001-gateway-url-fallback.md) before changing anything.

For complete instructions on generating keys and setup rules, see [Instruction_create_key.md](Instruction_create_key.md).

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: `v22.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Supabase CLI**: (optional, for local DB development)
- **Docker Desktop**: (optional, for containerized local testing)

### Step-by-Step Installation

1. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/Heizdoobert/Light-Story.git
   cd Light-Story
   npm install
   ```

2. **Generate API Type Definitions:**
   ```bash
   npm run generate:types
   ```

3. **Start Development Services:**
   - **Full Stack (Frontend + API Gateway):**
     ```bash
     npm run dev:all
     ```
   - **Frontend Only (`http://localhost:3001`):**
     ```bash
     npm run dev
     ```
   - **API Gateway Only (`http://localhost:8787`, remote bindings):**
     ```bash
     npm run dev:gateway
     ```

4. **Start Supabase Local Stack (Optional):**
   ```bash
   cd backend-supabase
   supabase start
   ```

## 🚀 Production Deployment

### Canonical Path: Cloudflare Workers + Supabase (GitHub Actions)

Pushing to `main` triggers [`.github/workflows/production.yml`](.github/workflows/production.yml), which after passing lint/typecheck/build/test:

1. Deploys the gateway Worker: `wrangler deploy --config workers/kv-worker/wrangler.jsonc` (secret `CLOUDFLARE_API_TOKEN`).
2. Pushes Supabase migrations: `supabase db push --include-all` against project `rwnzsmmfvsetfcnkjoxt` (secret `SUPABASE_ACCESS_TOKEN`).
3. Runs a smoke test against `https://kv-worker.hhhuygiau.workers.dev/api/stories`.

Production routing for the Worker is `api.lightstory.app/*`; the frontend deploys via the Vercel project configured by [frontend/vercel.json](frontend/vercel.json).

### Docker (Alternative / Local Production Simulation)

Light Story ships a unified single-container image (`node:22-slim`; postgres + gateway + frontend standalone).

1. **Build & Launch Production Containers:**
   ```bash
   npm run docker:build
   ```
   > ⚠️ `docker:build` tears down and prunes existing containers/images/volumes first. Use `npm run docker:up` for incremental runs.

2. **Launch Services in Production Mode:**
   ```bash
   npm run docker:up
   ```

3. **Manual Build Command:**
   ```powershell
   docker system prune -a --volumes -f; docker build --no-cache --pull -t light-story .
   ```

4. **Publish Frontend Image to Docker Hub (manual only):**
   ```bash
   docker build -f Dockerfile.frontend -t heizdoobert/light-story-frontend .
   docker push heizdoobert/light-story-frontend
   ```

See [README.Docker.md](README.Docker.md) for ports, health checks, and compose details.

---

## 🔒 Security & Access Control

- **JWT Validation**: All non-public routes passing through the Unified Gateway require a valid JWT bearer token.
- **Row-Level Security (RLS)**: Direct Supabase database queries enforce fine-grained user and admin permissions at the database level.
- **Cross-Origin Resource Sharing (CORS)**: Strict origin validation enforced by the API Gateway.
- **Signed Storage URLs**: Chapter media files stored in Cloudflare R2 are exposed using time-limited HMAC signed URLs to prevent unauthorized distribution.

---

## 🧪 Testing & Quality Assurance

Run the automated test suite and type checks (from `frontend/`, or via root scripts):

```bash
# Type checking & TypeScript validation
npm run typecheck

# Lint (0 errors required)
npm run lint

# Execute frontend integration tests (vitest run)
npm run test:run

# CI-equivalent verification
npm run ci:verify
```

Test tiers: `npm test -- __tests__/tier1` (or `tier2`). See [AGENTS.md](AGENTS.md) for agent-facing command conventions.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
