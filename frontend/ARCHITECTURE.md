# Frontend Architecture — Light Story

The presentation layer: **Next.js 16 (App Router)** + React 19 + TypeScript + Tailwind CSS v4. Serves `lightstory.app`.

## Directory Layout

```
frontend/
├── src/
│   ├── app/                     # App Router pages
│   │   ├── (admin)/             # Admin area — middleware requires superadmin/admin/employee
│   │   ├── (auth)/              # Login/register flows
│   │   ├── (errors)/            # Error pages (global error handling)
│   │   ├── (public)/            # Public pages (reader, comics, stories)
│   │   ├── (user)/              # Logged-in user area
│   │   └── api/                 # Server-side route handlers / BFF proxies
│   ├── components/              # Reusable UI (Tailwind v4, Lucide, shadcn-style)
│   ├── context/                 # React contexts (theme, auth, reader state)
│   ├── hooks/                   # Shared hooks
│   ├── lib/                     # Client + server utilities
│   │   ├── supabase/            # Supabase client/server/routeAuth helpers
│   │   ├── r2/                  # R2 upload helpers
│   │   ├── cbz/                 # CBZ comic package parsing
│   │   ├── security/            # Header / token helpers
│   │   └── utils/gateway-url.ts # Gateway URL resolution (see ADR-001)
│   ├── services/                # Domain service modules (comics, analytics, admin…)
│   ├── actions/                 # Server Actions
│   └── __tests__/               # Vitest suites (tier1/tier2), __integration__, __infra__
├── middleware.ts                # Security headers + route guards (runs on every request)
├── next.config.js               # Standalone output (DOCKER_BUILD=1), Sentry, images, headers
├── vercel.json                  # Build command only (rm -rf .next/cache && next build)
├── instrumentation.ts           # Runtime instrumentation
└── vitest*.config.ts            # Unit + integration test configs
```

## Key Behaviors

### Edge Middleware (`middleware.ts`)
Applies security headers + CSP to every response. Guards:
- Admin routes (`(admin)`): require a Supabase session with role `superadmin | admin | employee` (JWT metadata, DB fallback); otherwise redirect to unauthorized/forbidden.
- User routes (`(user)`): require login, else redirect to `/login`.

### Gateway Access (`src/lib/utils/gateway-url.ts`)
All API traffic goes to the unified gateway Worker. URL resolution is a **documented contract** with a silent fallback chain — see `docs/decisions/ADR-001-gateway-url-fallback.md`. Production order: `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION` → `NEXT_PUBLIC_GATEWAY_URL` → `https://kv-worker.hhhuygiau.workers.dev`; local: `NEXT_PUBLIC_GATEWAY_URL` → `http://localhost:8787`.

### Build & Deploy
- `next.config.js`: `output: "standalone"` only when `DOCKER_BUILD=1` (Docker image); otherwise standard Vercel build.
- Wrapped with `withSentryConfig` (org `dutteam`), `tunnelRoute: "/monitoring"` so Sentry does not need the DSN domain in CSP.
- Images: remote patterns restricted to `*.r2.dev` and `*.supabase.co` (`/storage/v1/object/public/**`), long cache TTL, avif/webp formats.
- Console stripped in production (errors kept), `reactStrictMode` on, `poweredByHeader` off.
- Vercel: configured by `vercel.json` (framework `nextjs`, build command clears `.next/cache`).

### Env Contract
`frontend/.env.example` is the source of truth for frontend keys; root `.env` is auto-imported into `frontend/.env.local` by `scripts/import_root_env.mjs`. `NEXT_PUBLIC_*` keys are inlined at build time — changing them requires a rebuild/redeploy.

## Testing
- Unit/integration: Vitest (`npm run test:run`), tiers in `src/__tests__/tier1`, `tier2`, `__integration__`.
- E2E: Playwright (`npm run test:e2e`; auth-boundary suite `test:e2e:auth`).
- CI gate: `ci:verify` = lint + build + test run.
