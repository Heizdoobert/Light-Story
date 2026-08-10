# Task 6 Report — (admin) Route Group Review

**Scope**: All 20 files under `frontend/src/app/(admin)/` (report-only, READ-ONLY — zero code changes).
**Date**: 2026-08-08 · **Workdir**: `D:\Light-Story\frontend`
**Method**: Every file read in full; supporting evidence checked in `src/hooks/features/use-*.ts`, `src/lib/actions/*.actions.ts`, `src/lib/security/permission.ts`, `src/lib/schemas/{comic,admin}.ts`, `middleware.ts`, `src/lib/constants/{routes,cache-tags}.ts`, `src/components/admin/{data-table,form-editor}.tsx`.

---

## Verdict Summary

| # | File | Verdict |
|---|------|---------|
| 1 | `(admin)/layout.tsx` | PASS with findings — auth+role guard present (client-side), but role sourced from `profiles.role` only, inconsistent with middleware/actions (app_metadata-preferred) |
| 2 | `(admin)/loading.tsx` | PASS |
| 3 | `(admin)/error.tsx` | PASS |
| 4 | `(admin)/not-found.tsx` | FAIL (Low) — unstyled Next boilerplate, English, hardcoded `/` |
| 5 | `admin/page.tsx` | PASS — thin redirect to `ROUTES.ADMIN.DASHBOARD`, uses ROUTES |
| 6 | `admin/loading.tsx` | PASS |
| 7 | `admin/error.tsx` | PASS |
| 8 | `admin/dashboard/page.tsx` | PASS with findings — thin (hook-driven); hardcoded live-status labels; table `overflow-x-auto` OK (L203) |
| 9 | `admin/comics/page.tsx` | PASS — thin (hook); table `overflow-x-auto` OK (L89); modal `max-h-[90vh] overflow-y-auto` OK (L181) |
| 10 | `admin/comics/new/page.tsx` | FAIL (Med) — dead `description` state, hardcoded status, silent failure on action error |
| 11 | `admin/comics/[comicId]/page.tsx` | FAIL (Med) — inline supabase fetch (thin-page), `description` edits silently dropped; no sibling loading/error (Low) |
| 12 | `admin/chapters/page.tsx` | FAIL (Med) — `useSearchParams` at page level without Suspense boundary (Next 15 prerender risk); table/modal classes OK (L93/L155) |
| 13 | `admin/chapters/[chapterId]/page.tsx` | FAIL (High) — edit form never loads existing values (data-loss on save), hardcoded `storyId='1'`, inline supabase, uploaded images never persisted; no sibling loading/error (Low) |
| 14 | `admin/users/page.tsx` | FAIL (Med) — modal missing `max-h-[90vh]`/`overflow-y-auto`; superadmin option shown to non-superadmins; table OK (L54) |
| 15 | `admin/categories/page.tsx` | FAIL (Med) — modal missing `max-h-[90vh]`/`overflow-y-auto`; table OK (L39) |
| 16 | `admin/ads/page.tsx` | PASS with findings — markup policy enforced client-side only (server accepts any markup); no table/modal |
| 17 | `admin/analytics/page.tsx` | PASS with findings — hardcoded default percentages shown as real; empty `top_zones` renders header-only; table OK (L173) |
| 18 | `admin/audit/page.tsx` | FAIL (High) — fabricated fallback audit entries displayed as real log; inline supabase read; no loading/error UI |
| 19 | `admin/settings/page.tsx` | FAIL (Med) — hardcoded Supabase project URL in UI (I.6); `"false"` string parsed truthy in hook (cross-ref) |
| 20 | `admin/profile/page.tsx` | PASS with findings — hardcoded fallback email; form thin (hook); mutations route through action fallback |

**Total findings: 25 — High 3 · Med 12 · Low 10**

---

## Checklist Results (brief acceptance criteria)

| Criterion | Result | Evidence |
|-----------|--------|----------|
| II.1 layout auth + admin role (app_metadata.role preferred, else profiles.role) | **PARTIAL** | middleware.ts:86-103 + permission.ts:37-40 use `app_metadata.role` w/ profiles fallback ✓; but `(admin)/layout.tsx:7` via `use-user.ts:29-38` reads `profiles.role` only — never app_metadata → F4 |
| Pages thin (services/actions, no inline business logic) | **PARTIAL** | comics/new, [comicId], chapters/[chapterId], audit pages contain inline supabase client calls / business logic → F5, F6, F8, F10 |
| No hardcoded URLs (I.6) | **PARTIAL** | All nav via `ROUTES` ✓; violations: settings:111 (supabase URL), not-found:8 (`/`), profile:83 (email), chapters/[chapterId]:25 (`storyId='1'`) |
| Zod on form inputs (I.7) | **PASS** | All server actions run `safeParse` (comic/chapter/settings/categories/user schemas). Gap: ad-markup policy not validated server-side (F14); description field absent from schema (F5/F7) |
| `revalidateTag(` 2-param (I.9) | **PASS** | All 73 call sites use `(tag, 'max')` — comic.actions:37,58-59,73-74; chapter.actions:54,82,98; settings.actions:30; categories.actions:29,48,63; user.actions:47,71; audit.actions:36 |
| No server-client leaks (III) | **PASS** | No server functions imported into client pages; no secrets in client components; page components are `"use client"` and pull data via client supabase/apiClient/actions |
| Tables `overflow-x-auto` | **PASS** | comics L89, chapters L93, users L54, categories L39, dashboard L203, analytics L173, audit via `DataTable` (data-table.tsx:22) |
| Modals `max-h-[90vh]`+`overflow-y-auto` | **PARTIAL** | comics L181 ✓, chapters L155 ✓; users L121 ✗ (F11), categories L82 ✗ (F12) |
| Dynamic segments sibling layout/loading/error (T2 LOW) | **CONFIRMED** | `admin/comics/[comicId]/` and `admin/chapters/[chapterId]/` contain only `page.tsx` — no sibling `loading.tsx`/`error.tsx` (inherit `admin/` segment files) → F20 |
| Report written, zero code changes | **PASS** | This file; `git status` clean of src changes |

---

## Findings

### High (3)

| # | Location | Issue | Severity | Rule ID |
|---|----------|-------|----------|---------|
| F1 | `admin/chapters/[chapterId]/page.tsx:16-18` | Edit page never loads existing chapter data — `chapterNumber` init `'1'`, `title` init `''` (no fetch). Saving silently overwrites the chapter with defaults → **data loss**. | High | II.1 (bug) |
| F2 | `admin/chapters/[chapterId]/page.tsx:25-27` | Hardcoded fallback `let storyId = '1'` — if the `chapters` lookup fails, update still runs and `revalidateTag(CACHE_TAGS.CHAPTERS(storyId), 'max')` revalidates a garbage tag (`chapters-1`), so the real story cache stays stale; `'1'` is not a UUID. | High | I.6 / I.9 |
| F3 | `admin/audit/page.tsx:26-29` | When the `audit_logs` table returns no rows, the page injects **fabricated entries** (`{id:'1', action:'CREATE_STORY', ...}`, `UPDATE_CHAPTER`) into the state and renders them as real audit records — falsifies the audit trail. | High | III (data integrity) |

### Med (12)

| # | Location | Issue | Severity | Rule ID |
|---|----------|-------|----------|---------|
| F4 | `(admin)/layout.tsx:7` (+ `use-user.ts:29-38`) | Role resolved from `profiles.role` only; `app_metadata.role` (the preferred source used by `middleware.ts:86-88` and `permission.ts:37-40`) is never consulted. Admin whose `profiles` row is missing/stale is locked out of the UI while actions work; or UI grants access that server actions deny — guard sources disagree. | Med | II.1 |
| F5 | `admin/comics/new/page.tsx:14,20` | `description` state collected but never submitted — `createComic({title, author, status})`; `createComicSchema` (schemas/comic.ts:3-11) has no `description` field. Dead state. | Med | II.1 (bug) |
| F6 | `admin/comics/[comicId]/page.tsx:19-30` | Inline `getSupabaseBrowserClient().from('stories').select('*')` in `useEffect` — direct DB read in page (thin-page violation); no loading/error state (silent empty form if fetch fails). | Med | II.1 |
| F7 | `admin/comics/[comicId]/page.tsx:16,35` | `description` loaded and editable but never included in `updateComic(comicId, { title, author })` — description edits are silently discarded. | Med | I.7 (bug) |
| F8 | `admin/chapters/[chapterId]/page.tsx:20-35` | Inline supabase `chapters` lookup inside submit handler (thin-page violation); no error handling (`finally` only) and no success feedback/redirect; if `updateChapter` fails, user gets no indication. | Med | II.1 |
| F9 | `admin/chapters/[chapterId]/page.tsx:54` | `ImageUploader` called without `onImagesUploaded` — uploaded page images are written to R2 but never associated via `updateChapter`/`chapter_images` → orphaned R2 objects; existing images never shown. | Med | bug |
| F10 | `admin/audit/page.tsx:18-36` | Inline supabase read of `audit_logs` (bypasses `logAdminActivity`/service layer); no loading state; errors only `console.error` — no user-facing error. | Med | II.1 |
| F11 | `admin/users/page.tsx:121` | Role-change modal container lacks `max-h-[90vh]` + `overflow-y-auto` (CLAUDE.md modal standard). | Med | CLAUDE.md |
| F12 | `admin/categories/page.tsx:82` | Category modal container lacks `max-h-[90vh]` + `overflow-y-auto` (CLAUDE.md modal standard). | Med | CLAUDE.md |
| F13 | `admin/settings/page.tsx:111` | Hardcoded Supabase project URL `https://xgtlrztskoomimvfpdoy.supabase.co` rendered in UI — must derive from `NEXT_PUBLIC_SUPABASE_URL` (hardcoded URL; also leaks infra detail). | Med | I.6 |
| F14 | `admin/ads/page.tsx:37,93` (+ `use-admin-ads.ts:90-99`) | Ad-markup policy (`validateAdMarkup` — allowed hosts, blocked terms) enforced **client-side only**; `saveSiteSettingsSchema` (schemas/admin.ts:3-10) accepts any `key/value` string, so the server action persists markup violating the policy (adult/casino/ad-fraud terms, non-allowed hosts). | Med | I.7 (security) |
| F15 | `admin/chapters/page.tsx:3,13-14` | `useSearchParams()` at page level without a `<Suspense>` boundary — client page is statically prerendered in Next 15; without Suspense this is a known static-render build failure risk. Verify with `npm run build`; if it builds, it is currently being bailed to CSR only by accident. | Med | N/A (Next 15 prerender) |

### Low (10)

| # | Location | Issue | Severity | Rule ID |
|---|----------|-------|----------|---------|
| F16 | `admin/comics/new/page.tsx:20` | Inline business logic: hardcoded `status: 'ongoing'` in the page instead of a form field/constant. | Low | II.1 |
| F17 | `admin/comics/new/page.tsx:21-24` | Silent failure — `if (res.success)` else nothing: no toast/error when `createComic` fails. | Low | II.1 |
| F18 | `admin/profile/page.tsx:83` | Hardcoded fallback email `admin@lightstory.app` displayed when `user?.email` missing. | Low | I.6 |
| F19 | `(admin)/not-found.tsx:6-8` | Stock Next.js boilerplate (English, unstyled) inconsistent with the rest of the admin group; hardcoded `href="/"` instead of `ROUTES.HOME`. | Low | I.6 / conventions |
| F20 | `admin/comics/[comicId]/`, `admin/chapters/[chapterId]/` | Dynamic segments lack sibling `loading.tsx`/`error.tsx` (inherit `admin/` segment files). T2 finding re-confirmed. | Low | dynamic-segment siblings |
| F21 | `admin/dashboard/page.tsx:132-138` | Hardcoded status text "KẾT NỐI SẮC NÉT (Active)" / "Port 8787" presented as live infrastructure state — not derived from any data. | Low | II.1 / UX |
| F22 | `admin/analytics/page.tsx:135-162` | Device-distribution bars show hardcoded defaults (65/30/5%) as real percentages when `data` is null; cards also default 99.5% / 4.2ms (L69, L78). | Low | UX |
| F23 | `admin/analytics/page.tsx:184-201` | `data?.top_zones.map(...) ?? fallback` — fallback row renders only when `top_zones` is nullish; empty array renders a header-only table with no empty-state row. | Low | UX |
| F24 | `(admin)/layout.tsx:17-24` | Inline 403 screen instead of redirecting to `ROUTES.ERROR.FORBIDDEN` (middleware does redirect; behavior inconsistent between layers). | Low | conventions |
| F25 | `admin/users/page.tsx:148` | "Super Admin" role option shown to all staff; server action correctly blocks non-superadmins (`user.actions.ts:61`), but the UI misleads and surfaces a guaranteed error. | Low | II.1 / UX |

---

## Cross-file notes (context for above, files outside scope)

- `use-admin-settings.ts:26` — `row.value === "true" || Boolean(row.value)` parses stored `"false"` as `true` (non-empty string is truthy) → maintenance/compact mode can never be turned off if value was ever written. Feeds `admin/settings/page.tsx`.
- `use-admin-chapters.ts:137` — `deleteChapter(id, targetComicId)` uses the modal's last target comic rather than the row's `story_id`, revalidating the wrong chapter cache tag on delete.
- `use-admin-chapters.ts:40-76` — `loadInitialData` re-runs when `targetComicId` is set inside it (extra fetch cycle; converges, no loop).

---

## Verification
- `git status`: no changes to tracked files; report-only task.
- 20/20 files in `src/app/(admin)/` read in full.
- Evidence for rule checks (I.6/I.7/I.9/II.1/III, CLAUDE.md) captured above.
