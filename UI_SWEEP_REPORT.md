# Light Story — UI Sweep Report (Checklist)

Pages and interactions sweep-checked in a live browser (Chrome DevTools MCP) against `npm run dev` (frontend, :3001) + `wrangler dev` (gateway, :8787) on 2026-08-08. Every page below was loaded and checked for render errors, console/network errors, dead links, and responsive/a11y basics. Findings verified against source unless marked `[unverified]`.

**Overall: PASS with 1 functional gap** (`/search` dead route) + 1 blocked area (authenticated surfaces). 64 failing unit tests triaged — all stale tests, no code regressions (evidence §5).

---

## 1. Route checklist

| Route | SSR status | Browser check | Verdict |
|-------|-----------|---------------|---------|
| `/` | 200 | Renders; theme + language toggles work | ✅ OK (EN-locale spot check pending, see §6) |
| `/comics` | 200 | Filter menu, sort, empty state all work | ✅ OK |
| `/genres/fake-slug` | 200 | Renders empty state | ✅ OK |
| `/search` | **404** | **Nav link + header search submit → 404** | ❌ DEAD ROUTE (§3.1) |
| `/auth/login` `/register` `/forgetPassword` | 200 | Header auth modal + EN login modal render | ✅ OK |
| `/auth/reset-password` | 200 | Invalid-token error state renders | ✅ OK |
| `/forbidden` `/unauthorized` | 200 | Render | ✅ OK |
| `/handle-exception/{400,401,403,404,503}` | 200 | All render | ✅ OK |
| `/profile` | — | Redirects to `/user/profile` login prompt | ✅ OK |
| `/user/dashboard` | — | Renders for guest | ✅ OK |
| `/admin` | — | 307 → `/handle-exception/401` | ✅ OK |
| `/user/reading-history` & admin tabs, notification bell, user modals | — | — | ⏸ Blocked: no test creds (§4) |
| `/comics/[comicSlug]` detail, reader, chapter | — | — | ⏸ Blocked: no data (§4) |

## 2. Functional checks

| Check | Result |
|-------|--------|
| Header search input submit | ❌ Navigates to dead `/search` (§3.1) |
| Auth login modal — empty form submit | ⚠ Silent no-op, no client-side validation feedback (`frontend/src/app/(public)/auth/` + header modal) |
| Theme toggle (light/dark) | ✅ Works |
| Language toggle (EN/VI) | ✅ Works |
| Gateway connectivity | ✅ Live; old Supabase fallback and `ERR_CONNECTION_REFUSED` gone (previously seen when gateway was down) |
| Admin route protection | ✅ `/admin` 307 → 401 handled page |
| Error pages | ✅ All handled-exception routes render |

## 3. Findings

### 3.1 DEAD ROUTE: `/search` (High, functional gap)
Search UI exists (`frontend/src/components/comics/SearchPageContent.tsx`) but no route mounts it. The header search box and nav links target `/search` → 404.

**Fix**: add a route under `frontend/src/app/(public)/search/` mounting `SearchPageContent` (it takes `initialQuery`), or repoint the nav links at `/comics`. Recommended: mount `SearchPageContent` with the query from `useSearchParams`.

### 3.2 Silent no-op on empty auth submit (Low, UX)
Empty submit on the login/register modal does nothing with no feedback. Minor — add a required-attribute / inline error.

### 3.3 Stale test infrastructure (Info, not product)
- **64 failing unit tests — all stale, no code regressions** (evidence §5). Three clusters:
  - **~37 tests: stale auth mocks.** Mocks provide `getSession`, but `requireActionRole` (`frontend/src/lib/security/permission.ts:31`) reads `auth.getUser()` → `user.app_metadata.role`. Files: `translators` (9), `admin-users` (8), `ops` (6), `bookmarks` (5), `reading-history` (4), `system-settings` (3), `p0_edge_cases` (2).
  - **~27 tests: stale fs-inspection / literal-string expectations.** Expects old page lists, literal `redirect('/handle-exception/403')` instead of `ROUTES.ERROR.FORBIDDEN`, literal `/api/admin/r2/upload` instead of `ROUTES.API.ADMIN.R2_UPLOAD_GATEWAY`, pre-refactor hooks barrel. Files: `tier1/f2_rsc_pages` (4), `tier2/f2_rsc_pages_boundary` (1), `tier4/f_real_world_scenarios` (1), `f5_r2_upload` (16), `tier3/f_cross_feature_interactions` (5).
  - **`readerHub.service.test.ts`**: import-time failure — `apiClient.ts:23` throws `NEXT_PUBLIC_GATEWAY_URL is not configured` in test env (env gap, not a product bug).
- **Playwright config stale** (missing `testDir`, baseURL `:3000` vs `:3001`) — not blocking unit-test fixes.
- Next.js warning: `middleware.ts` deprecated → migrate to `proxy` (Info).
- Vite warning noise (`configLoader: 'native'`, `__dirname` in `vitest.config.ts:18`) — ignorable.

## 4. Blocked (needs input, not code)

- **Authenticated/admin UI** (admin tabs, user modals, notification bell, reading-history drawer): needs an admin + user account. No creds provided.
- **Comic detail / reader / chapter pages**: need seeded data. Supabase is hosted (`rwnzsmmfvsetfcnkjoxt`) and empty; seeding requires user permission.

## 5. Evidence: 64 test failures are stale, not regressions

Full run: `npm run test:run` → **64 failed / 309 passed / 13 skipped** (16 failed files). Git history shows the code changed underneath the tests without the tests being updated:

- `a4e2164` fix(audit): PROJECT_RULES compliance — remove fake analytics data, centralize API URLs, enforce admin role guards (→ role-guard auth, URL-constant, hooks-barrel test breaks)
- `fe9ceb9` fix(frontend): remove API mock fallback (→ gateway-URL tests break)
- `18329af` fix(src): SRC-REMAINDER audit fixes (→ ROUTES-constant / page-list breaks)

## 6. Remaining (user-approved next steps)

1. ~~Report~~ ✅ (this file) → then `graphify update .` + vault note refresh
2. Fix the 64 stale tests (auth mocks → `getUser` + `app_metadata.role: 'admin'`; literal strings → `ROUTES` constants; page lists / hooks barrel; set `NEXT_PUBLIC_GATEWAY_URL` for the readerHub suite) → re-run to verify green
3. Fix `/search` dead route (§3.1)
4. EN-locale spot check (mixed-language home page) + mobile viewport (~375px) on `/` and `/comics`; re-check reader once data exists
