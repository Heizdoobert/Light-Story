# Contributing to Light Story

Thank you for your interest in contributing to **Light Story**! We welcome contributions from the open-source community. Please read this guide before submitting issues or pull requests.

---

## 1. Code of Conduct

All contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `[conduct@yourdomain.com]`.

---

## 2. Tech Stack Overview

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **API Gateway**: Single Cloudflare Worker (`kv-worker`, Hono / Wrangler) — unified gateway
- **Database & Auth**: Supabase PostgreSQL (`@supabase/ssr`, RLS policies, JWKS)
- **Containerization**: Docker & Docker Compose (`node:22-slim`)

---

## 3. Quick Local Setup

### Prerequisites
- Node.js `22.x` and `npm 10.x`
- Docker Desktop
- Supabase CLI (`npm install -g supabase`)
- Cloudflare Wrangler (`npm install -g wrangler`)

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Heizdoobert/Light-Story.git
   cd Light-Story
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Start Local Supabase Database**:
   ```bash
   cd backend-supabase
   supabase start
   ```

4. **Start Frontend & Workers locally**:
   ```bash
   # From project root
   npm run dev:all
   ```
   - Frontend: `http://localhost:3001`
   - API Gateway: `http://localhost:8787`

5. **Run via Docker (Optional)**:
   ```bash
   npm run docker:up
   ```
   Requires `docker-local.env` at the repo root. See [README.Docker.md](README.Docker.md).

---

## 4. Branch & Pull Request Guidelines

### Branch Naming Convention
We enforce feature branch isolation before merging to `main`:
- `feat/feature-name` (New features)
- `fix/bug-description` (Bug fixes)
- `docs/doc-update` (Documentation updates)
- `perf/optimization` (Performance changes)

### Submit a Pull Request
1. Fork the repo and create your feature branch from `main`.
2. Ensure code passes type checks and unit tests:
   ```bash
   npm --prefix frontend run lint
   npm --prefix frontend run test:run
   ```
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(reader): add custom zoom controls"
   ```
4. Open a Pull Request targeting the `main` branch. Complete all sections of the [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## 5. Security & Credentials

Never commit sensitive environment variables, private keys, or API tokens. Verify your `.env.local` is ignored before staging files. Report security issues per [SECURITY.md](SECURITY.md).
