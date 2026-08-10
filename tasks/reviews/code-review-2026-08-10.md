# Code Review — 2026-08-10

Scope: full project pass. 328 TS/TSX files (frontend/src) + kv-worker. Live change (7-file dirty tree + commit 0ce470f), history churn, breadth scan (4 parallel agents + direct verification).

## Live change verdict: Approve

Dirty tree (uncommitted, 7 files) + `0ce470f feat(admin): real server data in overview dashboard, remove fake stats`:

- UUID guards (`isValidUuid`, ~10 call sites in comics.ts/stories.ts) — closes injection vector into `id=eq.${id}` PostgREST filters. Good.
- `stories.ts` error-body fix — old code did `res.json()` then `res.text()` on error = "Body has already been read" crash. Fixed by reusing parsed data.
- Dashboard fake → real stats: shapes verified end-to-end. Worker `/admin/analytics/dashboard` returns `stats.{totalStories,totalChapters,activeStories,totalViews}` = matches local `OverviewStats`. RPC `get_user_engagement_summary(p_time_range default '24h', p_start_date, p_end_date)` returns `{dau, wau, mau, dau_change, new_signups, churn_rate_pct, ...}` = matches local `EngagementSummary`; frontend sends `p_time_range: '30d'` — correct param name. Infra endpoint returns `r2_usage_gb/r2_allocated_gb/r2_object_count` = matches. Correct.
- Reader not-found state (`ChapterReaderPageContent.tsx`), HomePage empty-state — fine.
- Worker authz chain verified sound: JWT validate → inbound `x-user-role` header stripped → re-set from `authCtx` → `requireRole` gates. Spoofing closed (`createForwardRequest` copies sanitized headers only; `getAuthRole` reads server-set header).
- Uncommitted worker telemetry (index.ts `detectDevice` + `recordAnalyticsEngineEvent` per request, wrangler.jsonc `analytics_engine_datasets` + `CLOUDFLARE_ACCOUNT_ID`) — good. Non-blocking best-effort. Note: dataset `lightstory_analytics` must exist in account or deploy fails.

## Critical

1. `frontend/src/components/reader/ChapterCommentsSection.tsx:25-61` — fabricated comments in production UI. Hardcoded reaction counts (heart: 124, fire: 89…), 3 fake usernames ("Phan Hoài Nam", "Minh Anh"…), fake timestamps ("10 phút trước"). Posting a comment mutates local state only — silently discarded on reload (data loss). No comments endpoint/action exists (`comments` table exists in `types/supabase.ts:320`). Fix: wire real API or remove section.

## Required

2. Missing i18n key `continue_reading` — `components/comics/HomePage.tsx:90` `t("continue_reading")`; key absent from `lib/i18n/translations.ts` (VI + EN). `LanguageContext.tsx:38` falls back to raw key → homepage renders literal "continue_reading". Add key (VI: "ĐỌC TIẾP", EN: "CONTINUE READING").

3. Dual auth systems, divergent semantics — `context/AuthContext.tsx` (`useAuth`, used by Header, admin-sidebar, RoleProtectedRoute, user layout, EditUserProfileModal, 3 presenters) vs `hooks/features/use-user.ts` (`useUser`, used by (admin)/layout, login/register, login-modal, notification-bell, useAdminProfile, user dashboard, users page). `AuthContext.tsx:24` normalizes `"super_admin"→"superadmin"`; `use-user.ts:16-21` does not → superadmin user passes one, fails the other (403 page while sidebar grants access). Defaults differ (`user` vs `null`). Token-purge loop copy-pasted (`AuthContext.tsx:306-311`, `use-user.ts:107-112`). Both mount on admin pages → double session fetch + double `onAuthStateChange`. Fix: make `useUser` a thin wrapper over `useAuth`, delete the other.

4. `lib/api/apiClient.ts:58-109` — sync token path drops expired tokens (`isTokenExpired` → null) then `supabase.auth.getSession()` may return stale/expired access token (no explicit refresh); `services/comics/comic.service.ts:170-173` explicitly calls `refreshSession()`. Inconsistent → API calls may send expired tokens while R2 uploads refresh. Fix: call `refreshSession()` in `getAccessTokenAsync` when token expired (matches CLAUDE.md "auto-refresh" claim).

5. Worker `GET /analytics/engagement` broken — `workers/kv-worker/src/routes/analytics.ts:58` passes `{ p_days_back: daysBack }`; SQL function `get_user_engagement_summary` signature is `(p_time_range text default '24h', p_start_date, p_end_date)` → PostgREST 400 (function not found with matching args). Frontend dashboard bypasses via `/api/supabase/rest/v1/rpc/` passthrough (correct param) — endpoint dead, not blocking. Fix: pass `{ p_time_range: '30d' }`.

6. Unbounded queries — `hooks/features/use-admin-comics.ts:42-45` (stories `.select()` no limit), `use-admin-chapters.ts:45-48, 57-66`, `use-admin-users.ts:31-34` (all profiles), `services/comics/story.service.ts:35-43` (fallback `select('*')`), `services/comics/comicCms.service.ts:120-132`, worker `/admin/analytics/dashboard` (`select=views&limit=10000`). Fix: `.limit()`/pagination.

7. `components/comics/FilterMenu.tsx:31` — `categories` hardcoded `useState<Category[]>([])`, never populated → dropdown always "No results…", category filter permanently dead. Header.tsx:106-120 already loads categories from `ROUTES.API.CATEGORIES` — reuse.

8. A11y: 6 inline admin modals without focus trap/Escape — `app/(admin)/admin/{comics,chapters,users,categories}/page.tsx`, `components/admin/content/AuthorManagementTab.tsx:381-450`, FilterMenu dropdowns. Shared `components/ui/modal.tsx` has Escape + initial focus — reuse.

9. Missing `"use client"` (works only by client-parent luck; future server import = build crash): `components/admin/content/AuthorManagementTab.tsx:1`, `components/navigation/Header.tsx:1`, `components/user/EditUserProfileModal.tsx:1`, `components/auth/RoleProtectedRoute.tsx:1`.

10. `getErrorMessage` ×2 divergent implementations, both live — `lib/utils/error-utils.ts:4` (AuthContext, actions) vs `hooks/common/useGlobalErrorHandler.ts:65` (app/providers.tsx:10). Different mapping (401/403/404 string match vs network-keyword match) → same error renders differently by path. Fix: delete one, re-export the other.

11. `app/(admin)/admin/audit/page.tsx:26-29` — unbounded browser-side query of `admin_audit_logs` (no limit, direct supabase). `ROUTES.API.ADMIN.AUDIT_LOGS(page, pageSize)` already defined — use it + pagination.

## Optional

- Dead code (~30 orphan exports, 8 dead hooks, test-only modules):
  - Hooks: `useStories`, `useStoryDetail`, `useStoryMutations` (+ `useOptimisticUpdate`), `useChapterDetail`, `useChapterSubscription`, `use-chapter-images.ts` (`useChapterImages`), `hooks/common/use-debounce.ts`
  - Services: `services/admin/systemSettings.service.ts` (whole), `services/admin/siteSettings.service.ts` (whole), `services/comics/storyMedia.service.ts` (whole), `admin.service.ts` 7/8 exports (only `getStoriesFieldValues` live), `comicCms.service.ts` 17/18 exports, `analytics.service.ts` 5/7 exports, `chapter.service.ts` `fetchChapterById`, `taxonomy.service.ts` `fetchCategories`/`fetchCategoryById`, `readerHub.service.ts` `toggleBookmark` (dup of `actions/bookmarks.actions.ts`)
  - Actions (server actions, 0 importers, kept alive by own tests): `admin-stories.actions.ts`, `admin-users.actions.ts`, `ads.actions.ts`, `ops.actions.ts`, `system-settings.actions.ts`, `story-form.actions.ts` (no test — fully dead), `lib/actions/audit.actions.ts` `logAdminActivity`
  - Components: `admin/forms/ChapterForm.tsx`, `comics/CreateComicForm.tsx` (test-only, 6 test files), `comics/AddComicChapterForm.tsx`, `user/ReadingHistoryDrawer.tsx`, `ads/ad-renderer.tsx` + `ads/index.ts`, `ui/dropdown-menu.tsx`
  - Utils: `lib/utils/format-date.ts` (whole), `lib/utils/db-change-toast.ts` `dbToastContext`, `lib/utils/image-url.ts` `formatImageWithCacheBuster`, `lib/admin/admin-navigation.ts` / `system-settings.ts` export clusters (test-only)
  - 16 vestigial barrel `index.ts` files (convention = direct imports)
  - Empty dir `src/hooks/presenters/__tests__/` (revert residue)
- Duplicate helpers: base-URL resolution ×3 (`apiClient.ts:17`, `comic.service.ts:128`, `actions/http.ts:4`), JWT decode + token read ×2, error-envelope parse ×2 (`parseErrorMessage` vs `messageFromResponse`), `ActionResult` type redefined inline ×6 files, `getVietnameseStatus` ×2, `applyComicCoverFallback` ×2, 4 different R2 upload paths (2 dead)
- Fake data remnants: `comicCms.service.ts:198-207` hardcoded moderation state, `app/(admin)/admin/comics/page.tsx:120` `"Fantasy"` fallback, analytics page R2 row hardcoded "Hoạt động", `comics/page.tsx:222-230` hardcoded category `<select>` options
- `components/shared/ads/AdZone.tsx` + `AdZoneColumns.tsx` — empty placeholder ad boxes on every public page; real pipeline is `reader/AdRenderer.tsx`. Delete placeholders + `layout.tsx:91` mount
- Hardcoded strings in files that otherwise use `t()`: `FilterMenu.tsx:191`, `Header.tsx:396,489,566,169,402`, `HomePage.tsx:61,181,251` ("Chapter 1"), `notification-bell.tsx:109`
- Hardcoded paths where ROUTES exists: `Header.tsx:579,626`, `ComicDetailPageContent.tsx:158` (`/search?category=`), `Header.tsx:185,434`, `public-footer.tsx:18` (`href="/"`), `placehold.co` ×3 sites
- `app/layout.tsx:63` `<html lang="en">` on VI-first site
- `key={idx}`: `admin/data-table.tsx:33`, `ComicDetailPageContent.tsx:149-163`
- `user-sidebar.tsx:14-33` no active-route highlight (admin-sidebar has it)
- `chapters/page.tsx:13-14` `useSearchParams` without `<Suspense>` boundary
- Notification bell: mark-read/clear writes localStorage only, never API
- Duplicate comic-create flows: `comics/new/page.tsx` vs `comics/page.tsx` modal
- Admin data paths inconsistent: pages read supabase directly, edit pages use `comic.actions`
- A11y nits: icon buttons without aria-label (`Header.tsx:176-182,347-360`, `Pagination.tsx:56-107`, `FilterMenu.tsx:103-108`, `SearchPageContent.tsx:60-65`, `EditUserProfileModal.tsx:170-175`, categories page Edit/Delete), `settings/page.tsx` sr-only checkboxes without accessible names, `AuthorManagementTab.tsx:17-35` tab buttons lack `role="tab"`/`aria-selected`, EN/VI string mixing in auth forms
- `dto.ts:1-2` imports `DashboardTabVisibility, SidebarMenuVisibility` without `import type` → drags lucide-react runtime icons into bundles
- `readerHub.service.ts:3` imports `getAccessToken` from comic.service (cross-feature coupling)

## FYI / process

- Admin revert churn: 5 commits today (~8000-line tabbed admin built in 3af805c, then revert → revert → re-apply dead-code removal → revert again; net zero). Root cause: single giant commit. Next time split into ~300-line slices.
- `types/supabase.ts` 1495 lines — generated, fine.
- Revert cleaned all dangling imports — no test references deleted code. Tests: 46 files, 17 in tiers + 29 outside; 0 broken imports.
- Test tier naming drift: tier2 reuses f1–f7 numbers, tier3/4 have no `f<N>` prefix, 29 tests outside `__tests__/tier<N>/`.
- Tests skew toward source-inspection string asserts (f2/f4/f5/f6, worker source checks) — drift-prone on legit refactors.
- `supabase.integration.test.ts` makes live network calls, env-gated (intentional).
- RPC matches verified: `increment_story_views(story_id_param uuid)` ✓. `get_user_engagement_summary` ✓ (only worker `/analytics/engagement` wrapper broken, see #5).
- Uncommitted working-tree: HomePage/ChapterReader/opencode.json/task-2-report + worker files. `tasks/` docs untracked — out of scope.

## Verification plan

- `npm run lint` (frontend)
- `npm run test:run` (frontend)
- Worker typecheck / `wrangler deploy --dry-run`
- Confirm AE dataset `lightstory_analytics` exists in account (8ee8907819b5859d9543d68380ab6c1a)

## Fix status (2026-08-10)
- #1 Critical: DONE - fake comments gutted, placeholder kept (no backend exists)
- #2: DONE - continue_reading key added VI+EN
- #3: DONE - useUser is now a thin wrapper over useAuth (single impl)
- #4: DONE - getAccessTokenAsync calls refreshSession() on expired token
- #5: DONE - worker /analytics/engagement passes p_time_range
- #6: DONE - .limit(500) on use-admin-comics/users/chapters
- #7: DONE - FilterMenu loads categories from ROUTES.API.CATEGORIES
- #8: DONE - useModalA11y hook (Escape + focus) wired into 5 inline modals
- #9: DONE - 'use client' added to 4 components (UTF8-safe, no BOM)
- #10: DONE - single getErrorMessage in lib/utils/error-utils, hooks/common re-exports
- #11: DONE - audit page uses apiClient + AUDIT_LOGS route + pagination
- Verification: 388/388 tests, frontend tsc clean, worker tsc clean
