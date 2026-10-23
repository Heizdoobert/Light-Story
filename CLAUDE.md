# Light-Story Monorepo Guidelines

## Project Overview
Light-Story is a high-performance, edge-first comic, manga, and light novel web platform featuring a serverless edge gateway, Supabase database, and an enterprise Admin CMS.

---

## Tech Stack
- **Monorepo**: npm workspaces (`frontend`, `packages/sdk`, `packages/ui`, `packages/api-types`, `workers/*`, `backend-supabase`)
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Radix UI (public reader/catalog)
- **Admin UI SDK (`@light-story/ui`)**: Ant Design v5, `@ant-design/cssinjs` (SSR style registry), `@ant-design/icons`, theme tokens (`#f97316`)
- **Core SDK (`@light-story/sdk`)**: TypeScript, zero runtime dependencies (`StorageManager`, `HttpClient`, formatters, R2 gateway)
- **Edge Gateway (`workers/kv-worker`)**: Cloudflare Workers, R2 object store, KV caching, Web Crypto JWT authentication, Hyperdrive
- **Database (`backend-supabase`)**: Supabase PostgreSQL with Row Level Security (RLS)

---

## Essential Commands

### Build & Typecheck
- Frontend typecheck: `npm --prefix frontend run typecheck`
- Frontend build: `npm --prefix frontend run build`
- SDK build: `npm --prefix packages/sdk run build`
- UI SDK build: `npm --prefix packages/ui run build`

### Testing
- SDK unit tests: `npm --prefix packages/sdk test`
- UI SDK unit tests: `npm --prefix packages/ui test`
- Frontend targeted test: `npm --prefix frontend run test:run <path-to-test-file>`
- Full frontend test suite: `npm --prefix frontend run test:run`

### Linting
- Frontend linter: `npm --prefix frontend run lint`

### Local Development
- Frontend: `npm --prefix frontend run dev` (runs on http://localhost:3000)
- Edge Worker Gateway: `npm run dev:gateway` (runs on http://localhost:8787)
- Combined: `npm run dev:all`

---

## Critical Boundaries & Constraints

1. **Strict UI Boundary (Ant Design vs Tailwind CSS)**:
   - Ant Design (`@light-story/ui`, `antd`, `@ant-design/*`) is **strictly restricted to Admin routes** (`frontend/src/app/(admin)/*`).
   - Public reader, comic details, search, and user profile routes must **never** import Ant Design; they use Tailwind CSS 4 and Radix UI primitives.
2. **Monorepo Package Hygiene & Single React Instance**:
   - Always run `npm install` from the **monorepo root**. Never run `npm install <pkg>` directly inside subdirectories without workspace flags (`-w`), as npm will create nested `node_modules/react` and break React 19 hooks with invalid hook call errors.
   - `frontend/vitest.config.ts` must maintain the explicit `react` and `react-dom` aliases pointing to root `node_modules/react`.
3. **Zero Runtime Dependencies for Core SDK**:
   - `@light-story/sdk` must maintain **0 runtime dependencies**. All HTTP, validation, and storage operations rely on standard Web APIs (`fetch`, `crypto`, `FormData`, `Blob`).
4. **Authorization & Server Actions**:
   - Every mutating server action must verify caller permissions using `await requireActionRole(ACTION_ADMIN_ROLES)` and validate payloads using Zod schemas (`safeParse`).
5. **Storage & Path Sanitization**:
   - All R2 storage keys and folder names must be sanitized via `sanitizeStorageKey` and `sanitizeFolder` in `@light-story/sdk` to prevent multi-dot (`..`) directory traversal.
6. **XSS & Ad Sanitization**:
   - All external/advertiser markup must be sanitized using `sanitizeAdMarkup` with `dompurify` (>= 3.4.17) and strictly allowlisted script origins.

---

## Code Conventions
- **Exports**: Use named exports for utilities, components, and functions. Use default exports exclusively for Next.js App Router route entrypoints (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
- **Icons**: Use `lucide-react` for public reader routes; use `@ant-design/icons` (or curated re-exports from `@light-story/ui`) for Admin CMS pages.
- **Styling**: In admin components, use Ant Design's `styles={{ body: ... }}` or semantic tokens; in public components, use Tailwind CSS utility classes.
- **Formatting**: Always format Vietnamese chapter titles and metrics using `@light-story/sdk` (`formatChapterTitle`, `formatNumberShort`, `formatDate`).
