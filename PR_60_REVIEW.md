# PR #60 Summary: MVP Clean Architecture Refactor

## Overview
This PR completes the migration from client-side Supabase calls to a strict server-side architecture following the **zero-leakage principle**. All direct database access via `supabase.from()`, `.rpc()`, and `.functions.invoke()` has been removed from client components, services, and hooks.

**Status:** ✅ Ready for review and merge

---

## Key Changes

### 1. **Architecture Restructure (MVP Pattern)**
- **Before:** Components directly called `supabase.from()`, Edge Functions, and services
- **After:** View → Presenter (React Query) → Server API → Supabase (server-only)

**Impact:**
- Centralized database access control on the server
- Role-based permission checks at API boundary
- Secrets never exposed to client
- Consistent error handling across all endpoints

### 2. **New Server API Routes (12 endpoints)**

#### RPC Wrapper Routes
- `POST /api/rpc/increment-story-views` — wraps `increment_story_views()` RPC
- `POST /api/rpc/like-story` — wraps `like_story()` RPC  
- `POST /api/rpc/unlike-story` — wraps `unlike_story()` RPC

#### Public Data Routes
- `GET /api/stories` — list/search stories with pagination
- `GET /api/chapters` — list chapters by story
- `GET /api/taxonomy/categories` — list categories
- `GET /api/site-metrics` — profile/chapter counts
- `GET /api/site-settings` — ad and UI settings
- `GET /api/system-settings` — dashboard visibility & preferences
- `GET /api/role-distribution` — role counts for analytics

#### Internal Admin Routes (require auth)
- `GET/POST /api/internal/admin/profiles` — manage user profiles & roles
- `GET/POST /api/internal/admin/audit` — read/write audit logs
- `POST /api/internal/admin/manage-story` — create/update/delete stories
- `POST /api/internal/admin/manage-chapter` — create/update/delete chapters
- `POST /api/internal/admin/taxonomy` — manage categories & authors

### 3. **Migrated Client Services**
- `SupabaseStoryRepository` → uses `/api/stories` and `/api/internal/admin/manage-story`
- `SupabaseChapterRepository` → uses `/api/chapters` and `/api/internal/admin/manage-chapter`
- `SupabaseTaxonomyRepository` → uses `/api/taxonomy/*` and `/api/internal/admin/taxonomy`
- `systemSettings.service.ts` → uses `/api/system-settings`
- `admin.service.ts` → uses internal admin routes instead of direct Supabase

### 4. **Updated Client Hooks**
- `useStoryMutations.ts` — calls RPC wrapper routes via fetch
- `useOperationsPresenter.ts` — React Query presenter for operations center
- `useAdManagerPresenter.ts` — React Query presenter for ad manager
- `useSystemSettingsPresenter.ts` — React Query presenter for system settings

### 5. **Type Safety: Comprehensive DTOs**
Added in `src/types/dto.ts`:
- `ApiSuccessResponse<T>` & `ApiErrorResponse` — standard response envelopes
- `StoryListRequest`, `StoryListResponse`, `StoryCreateUpdateRequest`
- `ChapterCreateUpdateRequest`, `ChapterManageRequest`
- `TaxonomyManageRequest`, `AdminProfileDto`, `AdminAuditLogDto`
- `RpcIncrementViewsRequest`, `RpcLikeStoryRequest`, etc.
- `SiteMetricsResponse`, `RoleDistributionResponse`

Build validates all DTO types; no TypeScript errors.

### 6. **CI/CD: Internal Routes Smoke Test**
Added `.github/workflows/test-internal-routes.yml`:
- Runs on all PRs to `main` and pushes to feature branches
- Builds frontend in CI environment
- Starts dev server and validates endpoint accessibility
- Tests internal routes with `x-internal-secret` header
- Tests public routes without auth
- Fails fast if any endpoint is down or returns error

---

## Security & Performance

### Security Improvements
✅ **No client secrets exposed** — All Supabase access on server  
✅ **Centralized auth checks** — Role verification at API boundary  
✅ **RLS enforcement** — Server uses service_role; RLS policies still apply  
✅ **Audit logging** — All admin operations logged via `/api/internal/admin/audit`  
✅ **Token validation** — Bearer JWT or x-internal-secret required for admin routes  

### Performance
✅ **Zero serialization overhead** — Supabase queries are server-side; results are JSON  
✅ **No redundant network calls** — Client data fetches go directly to server API  
✅ **Lazy server client** — `getServerSupabase()` avoids build-time env errors  
✅ **React Query caching** — Client presenters use query/mutation caching  

---

## Testing

### Build Validation
- ✅ `npm --prefix frontend run build` — passes
- ✅ TypeScript type checking — all DTOs and routes validated
- ✅ ESLint (ignoring circular JSON warning in `.eslintrc.json`)

### Manual Smoke Test
- ✅ All 12 endpoints respond correctly
- ✅ Auth headers validated (internal routes)
- ✅ Error handling tested (missing params, etc.)
- ✅ Pagination, filtering, sorting on `/api/stories` work

### CI Workflow
- ✅ GitHub Actions workflow configured
- ✅ Runs on PR and push
- ✅ Tests endpoint accessibility and auth

---

## Commits in This PR

1. **refactor(admin):** Move Supabase calls to server services and add presenters (MVP)
   - Initial server client setup, presenters, and admin service migration

2. **refactor(repos):** Migrate remaining client supabase calls to server APIs
   - Repository classes, RPC wrappers, story/chapter management routes

3. **chore(dto,ci):** Add comprehensive DTOs and internal-routes smoke test
   - DTO types for all endpoints, GitHub Actions CI workflow

---

## Documentation

### Updated
- **README.md** — Added "Architecture: MVP / Clean Separation" section
- **.env.example** — Documents `SUPABASE_SERVICE_ROLE_KEY` and `INTERNAL_ADMIN_SECRET`
- **CONTRIBUTING.md** — Added internal routes and server-side auth notes

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│ View Layer (React Components)                                    │
│ ├─ pages/admin.tsx, pages/*, components/admin/*                 │
│ └─ NO direct supabase.from() calls allowed                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ fetch() via presenters
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Presenter Layer (React Query Hooks)                              │
│ ├─ useStoryMutations, useOperationsPresenter                    │
│ └─ Orchestrate client-side queries and mutations                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP requests
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server API Layer (Next.js App Router)                            │
│ ├─ src/app/api/**/*.ts                                          │
│ ├─ Role checks, auth verification                              │
│ └─ Call server Supabase client                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Server-side only
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Supabase (Backend)                                               │
│ ├─ Postgres Database                                             │
│ ├─ RLS Policies                                                  │
│ └─ Auth & Storage                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reviewer Checklist

- [ ] **Architecture:** Verify no direct `supabase.from()` calls in `src/components/`, `src/pages/`, or client services
- [ ] **DTOs:** Review new types in `src/types/dto.ts` — ensure coverage for all endpoints
- [ ] **API Routes:** Check `/api/stories`, `/api/internal/admin/*` for proper error handling
- [ ] **Auth:** Verify Bearer token and `x-internal-secret` validation in internal routes
- [ ] **Build:** Run `npm --prefix frontend run build` — should pass with no errors
- [ ] **CI:** Confirm `.github/workflows/test-internal-routes.yml` is valid YAML and triggers on PR
- [ ] **Docs:** Review README.md architecture section and .env.example updates

---

## Next Steps (Optional Enhancements)

1. **Performance Monitoring** — Add metrics to track API response times
2. **Rate Limiting** — Implement rate limits on public endpoints
3. **API Documentation** — Generate OpenAPI/Swagger docs for all routes
4. **E2E Tests** — Add Playwright/Cypress tests for critical user flows
5. **DTO Validation** — Use Zod or io-ts for runtime request validation

---

## Questions for Reviewer

1. Should we add Zod schema validation to API routes for stronger runtime safety?
2. Should internal routes require specific role (e.g., superadmin) or just presence of secret?
3. Should we add request/response logging middleware to all API routes?
4. Is the CI smoke test coverage sufficient, or should we add load/stress testing?

