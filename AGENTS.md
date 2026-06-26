Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

## Project: Light Story

Next.js 14 + Supabase + 5 Cloudflare Workers. Comic/manga reading platform.

## Architecture

Gateway-driven domain workers pattern. 5 Workers:

| Worker | Route | Role |
|--------|-------|------|
| `api-gateway` | `/api/*` | Auth, CORS, rate-limit, route dispatch via service bindings |
| `stories-worker` | `/api/stories*`, `/api/chapters*` | Story/chapter CRUD |
| `comics-worker` | `/api/comics*` | Comic CMS operations |
| `admin-worker` | `/api/admin*` | Admin operations |
| `analytics-worker` | `/api/analytics*` | Dashboard analytics |

Gateway handles JWT validation (JWKS), HMAC for R2 signed URLs, CORS, rate limiting. All domain workers called via service bindings.

## Frontend (frontend/src/)

```
src/app/               - Next.js App Router pages
  admin/               - Admin dashboard (auth-protected)
  comics/              - Comic CMS pages
  story/               - Story/chapter reader
  auth/                - Auth pages (login, reset password)
  handle_exception/    - Error pages (400/401/403/404/503)
src/components/        - Shared components
  charts/              - Recharts-based analytics charts
  guards/              - ProtectedRoute, RoleBasedGuard
  navigation/          - DashboardSidebar
  reader/              - Chapter reader + ad renderer
  shared/              - LoginModal, ErrorBoundary, etc.
src/hooks/             - Presenter hooks (useAuth, useAnalyticsDashboard, etc.)
src/services/          - API client layer (apiClient, services)
src/lib/               - Utilities, auth helpers, ad policy, system settings
src/types/             - TypeScript type definitions (analytics, DTOs, entities)
src/modules/           - Auth/Theme React contexts
src/presenters/        - Query hooks with fallback data
src/shared/core/       - Base classes (BaseRepository, BaseService, DomainError, Result)
src/infrastructure/    - Supabase client, repositories
src/application/       - Use cases (Clean Architecture layer)
src/domain/            - Domain interfaces, entity types
src/presentation/mvp/  - MVP pattern (ReaderPresenter, AdminPresenter)
```

## Core Module Map (graphify communities)

1. **Analytics Dashboard** (`AnalyticsDashboardTab`, `TrendsSection`, charts, services) - admin analytics page
2. **Comic CMS** (`ComicManagementTab`, `create_chapter`, `create_comic`, comic service) - authoring tool
3. **Admin CMS** (`AdminLayout`, `SystemSettingsTab`, `UserManagement`, `CategoryManagement`) - admin UI
4. **Auth** (`AuthContext`, `LoginModal`, `ProtectedRoute`, `RoleBasedGuard`) - Supabase auth + RBAC
5. **API Gateway** (`JWT validation`, `fetchJWKS`, `CORS`, service bindings, worker routes) - edge auth
6. **Error Handling** (`ErrorBoundary`, error pages (400-503), `GlobalErrorHandler`)
7. **System Settings** (`SystemSettingsTab`, `DashboardAccessLogsTab`, `OperationsDataTab`)
8. **Ad Manager** (`AdManager`, `AdPolicy`, `AdRenderer`, site settings)
9. **Reader** (`ReaderPage`, `MVP ReaderPresenter`, `ChapterRepository`)
10. **Shared Core** (`DomainError`, `Result`, `Logger`, `BaseRepository`, `BaseService`)

## Key Dependencies

- `next` 14 App Router
- `@supabase/supabase-js` + `@supabase/ssr`
- `@tanstack/react-query` for data fetching
- `recharts` for analytics charts
- `zod` for form validation
- `lucide-react` for icons
- `sonner` for toasts
- `tailwindcss` + `class-variance-authority` + `clsx` + `tailwind-merge`

## Workers Stack

- **Runtime**: Cloudflare Workers (ES modules format)
- **Deploy**: `wrangler deploy` per worker
- **Dev**: `npm run dev:all` (runs all 5 workers via concurrently)
- **Bindings**: Service bindings connect api-gateway → domain workers
- **DB**: Supabase PostgreSQL (not D1)
- **Storage**: Cloudflare R2 (signed URLs via r2-signed-url worker)

## Graph Knowledge (graphify)

- 1182 code nodes, 2170 edges, 78 semantic communities
- Most connected: `useAuth()` (43 edges), `compilerOptions` (32), `dependencies` (24), `fetch()` (24), `API Gateway Worker` (22)
- Core hyperedges: FE/BE Decoupling Architecture (gateway + workers + OpenAPI + auth), Auth Flow Gateway-Centric (JWT + gateway + Supabase + RBAC), Deployment & Observability stack
- Clean Architecture layers: `frontend/src/shared/core/` (errors, result, logger, base classes), `src/application/use-cases/`, `src/domain/interfaces/`, `src/infrastructure/repositories/`

## DB

Supabase project `xgtlrztskoomimvfpdoy` (truyentranh3x, Singapore). 26 tables. Supabase client via `@supabase/ssr`. Service role key for worker-to-Supabase, anon key for client. JWKS at `/auth/v1/.well-known/jwks.json`.
