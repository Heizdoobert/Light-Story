# Findings — Frontend /src/app Full Sweep (compiled, controller-adjudicated)

Sources: tasks/reports/task-{2,3,4,5,6,7}-report.md. All file paths under `frontend/`.

## HIGH (7)

| # | Location | Issue | Fix |
|---|----------|-------|-----|
| H1 | `src/app/(admin)/admin/chapters/[chapterId]/page.tsx:16-18` | Edit page never loads existing chapter (number init '1', title '') → save silently overwrites → data loss | Load chapter before render; init from data; require real storyId |
| H2 | same file :25-27 | `storyId='1'` fallback → update + `revalidateTag('chapters-1')` garbage tag, real cache stale | Remove fallback; abort if lookup fails (or take storyId from loaded chapter) |
| H3 | `src/app/(admin)/admin/audit/page.tsx:26-29` | Fabricated fallback audit entries rendered as real logs | Delete fake-entry fallback; render empty state |
| H4 | `src/app/(public)/genres/[genreSlug]/page.tsx:3-4` | Slug ignored → genre page shows unfiltered search | Wire slug into category filter or redirect to `/search?category=<slug>` |
| H5 | `src/app/(user)/layout.tsx:9-23` | No auth guard on the logged-in group; `/user/*` open to anyone | Add session check + redirect (match middleware/`ROUTES`) |
| H6 | `src/app/(user)/user/profile/page.tsx:42-55` | Happy path writes `profiles` directly via browser client, bypasses Zod + `updateUserProfile` action | Route through the action (already exists); drop direct write |
| H7 | `src/components/navigation/Header.tsx:92` (T3 F-01a, adj. High) | Client fetch to `/api/comics?...` — route doesn't exist → search always 404/empty | Point at real service/action (comic.service catalog fetch) or remove |

## MEDIUM (27)

| # | Location | Issue |
|---|----------|-------|
| M1 | `src/components/admin/comics/TranslatorManagementTab.tsx:73` | Dead `/api/admin/translators` fetch; use existing translators.actions |
| M2 | `src/app/api/avatar/route.ts:46` | Unbounded `arrayBuffer()` on public route — memory exhaustion vector; cap size |
| M3 | `src/app/api/r2/proxy/route.ts` | `chapters` served unauthenticated — **PRODUCT QUESTION** (premium?) |
| M4 | `src/app/api/r2/upload/route.ts:77` | Whole file buffered to memory up to 250MB cap |
| M5 | `src/app/layout.tsx:9,12` | `metadataBase` conditional on undocumented `NEXT_PUBLIC_SITE_URL` → OG falls back localhost; add to .env.example |
| M6 | `src/app/error.tsx:32` | Raw `error.message` rendered; guard like `ErrorBoundary.tsx:44` (dev-only) |
| M7 | `src/app/global-error.tsx:19` | Tailwind classes never load (no globals) — import globals.css or inline styles |
| M8 | `src/app/sitemap.ts:5-15` | Unguarded `BASE_URL` → literal "undefined" URLs in sitemap |
| M9 | `src/components/auth/ResetPasswordPage.tsx:40-48` | Manual password validation, no Zod auth schema (login-modal same) |
| M10 | `comics/[comicId]/page.tsx` + `layout.tsx` | Duplicate `generateMetadata` → 2x Supabase queries per view; keep layout's, drop page's |
| M11 | `SearchPageContent.tsx:150`, `ComicDetailPageContent.tsx:94,105,204`, `ChapterReaderPageContent.tsx:88,140,149,205,256` | 9 hardcoded URL templates → `ROUTES.COMIC_DETAIL/CHAPTER_READER` |
| M12 | `(admin)/layout.tsx:7` (+`use-user.ts:29-38`) | Role from `profiles.role` only; app_metadata.role (preferred) never consulted — guards disagree |
| M13 | `admin/comics/new/page.tsx:14,20` | Dead `description` state, never submitted |
| M14 | `admin/comics/[comicId]/page.tsx:19-30` | Inline supabase read in useEffect; no loading/error state |
| M15 | same :16,35 | `description` edits silently discarded (not in updateComic) |
| M16 | `admin/chapters/[chapterId]/page.tsx:20-35` | Inline supabase lookup in submit; no error/success feedback |
| M17 | same :54 | `ImageUploader` w/o `onImagesUploaded` → orphaned R2 objects, images never persisted |
| M18 | `admin/audit/page.tsx:18-36` | Inline supabase read of audit_logs; console.error only |
| M19 | `admin/users/page.tsx:121` | Modal lacks `max-h-[90vh]`+`overflow-y-auto` |
| M20 | `admin/categories/page.tsx:82` | Modal lacks `max-h-[90vh]`+`overflow-y-auto` |
| M21 | `admin/settings/page.tsx:111` | Hardcoded supabase project URL in UI → derive from env |
| M22 | `admin/ads/page.tsx:37,93` (+use-admin-ads) | Ad-markup policy client-side only; server accepts any markup — enforce server-side |
| M23 | `(user)/user/` | `/user` route 404s — no page.tsx (T2 MED confirmed) |
| M24 | `(user)/user/profile/page.tsx` vs `ProfilePageContent.tsx` | Duplicate profile UI; canonical component unused (misses sanitizeImageUrl) |
| M25 | `ReadingHistoryDrawer.tsx:40`, `UserReadingHistoryPageContent.tsx:65,77`, `UserBookmarksPageContent.tsx:54,62` | Hardcoded `/comics/...` URLs → ROUTES |
| M26 | `(user)/error.tsx`, `(user)/loading.tsx` | Dead files (no page at segment; user/ has own) |
| M27 | `(user)/user/dashboard/page.tsx:55,145-149` | progressPct hardcoded 0; latestChapter never set; N+1 fetchStoryById |
| M28 | `src/hooks/features/use-admin-settings.ts:26` | `"false"` string parsed truthy — boolean setting can't be turned off |
| M29 | `src/hooks/features/use-admin-chapters.ts:137` | deleteChapter uses modal's last targetComicId, not row's story_id → wrong cache tag |

## LOW (~35, fix in batch 4 — smallest change each)

- T3: F-02 avatar manual validation (Zod marginal — skip, note), F-03 redirect check (manual), F-06 proxy manual validation (note), F-07 proxy buffer guard, F-08 upload octet-stream looseness (note), F-10 webhook dev bypass (note)
- T4: L1 hardcoded VI in error/global-error, L2 `lang="vi"` vs `en`, L3 not-found `<a>` → Link, L4 EN vs VI mix, L5 robots stale `/dashboard`, L6 auth pages in sitemap, L7 dead `--color-primary`, L8 destructive==accent/muted purple
- T5: F4 unguarded generateMetadata queries (try/catch), F7 stub auth pages (**PRODUCT QUESTION** — real pages or leave), F8 missing mid-level loading/error, F9 SSR-empty observation (no fix)
- T6: F16 hardcoded status 'ongoing', F17 silent failure createComic, F18 hardcoded fallback email, F19 admin not-found boilerplate + `/` href, F20 dynamic segments no siblings, F21 hardcoded live-status labels, F22 hardcoded analytics percentages, F23 empty top_zones header-only, F24 inline 403 screen, F25 superadmin option for all, F15 useSearchParams no Suspense (note — build passes)
- T7: F10 sidebar label mismatch, F11 actions dir split (note), F12 StatusErrorPage `<a>` → Link, F13 raw error.message x3 error boundaries
- T2: (errors) group no layout/loading/error; (auth) layout done in T2 ✓

## Resolved (no fix)

- T7-F8 `/auth/*` 404 — FALSE: T1 build lists /auth/login etc. live via (public)/auth. (auth) group empty is plan-accepted.
- T3 header tally mismatch — adjudicated to 7H/27M list above (F-01a → H7).
- T6-F15 Suspense — build passes; note only.

## Out of scope (flagged, not fixed)

- components barrel exports (II.2), middleware CSP (IV), lib/actions internals, login/register real page forms (feature work — see PRODUCT QUESTIONS).
