# Task 9f Report — Fix Batch 3f: (user) group structure + dashboard

Date: 2026-08-09
Scope: M23 (/user 404), M26 (dead error/loading files), M27 (dashboard hardcoded progress + N+1)

## Changes

| File | Action |
|---|---|
| `frontend/src/app/(user)/user/page.tsx` | NEW — server redirect to `ROUTES.USER.DASHBOARD` |
| `frontend/src/app/(user)/error.tsx` | DELETED |
| `frontend/src/app/(user)/loading.tsx` | KEPT (finding partially wrong — see M26) |
| `frontend/src/app/(user)/user/dashboard/page.tsx` | MODIFIED (M27) |
| `frontend/src/components/user/reading-progress.tsx` | DELETED (only consumer was the dashboard) |
| `frontend/src/components/user/index.ts` | MODIFIED — dropped dead `reading-progress` re-export |
| `frontend/src/services/comics/story.service.ts` | MODIFIED — added `fetchStoriesByIds` batch fetch |
| `frontend/src/__tests__/tier1/f2_rsc_pages.test.ts` | MODIFIED — registered new server page |
| `frontend/src/__tests__/tier2/f2_rsc_pages_boundary.test.ts` | MODIFIED — registered new server page |

## Per-finding before/after

### M23 — `/user` route 404s (T2 MED confirmed)
- **Before**: `(user)/user/` had no `page.tsx`; `/user` returned 404.
- **After**: `page.tsx` is a thin server component: `redirect(ROUTES.USER.DASHBOARD)` — same pattern as `(public)/profile/page.tsx`. `/user` now renders and redirects to `/user/dashboard`. Confirmed in build route table: `○ /user` listed.

### M26 — `(user)/error.tsx`, `(user)/loading.tsx` "dead"
- **error.tsx — Before**: group-level error boundary, shadowed by `user/error.tsx` (only child of the group), convention-only (cannot be imported) → never rendered.
  **After**: DELETED. No references (nothing can import it; no other route under `(user)`).
- **loading.tsx — Before**: group-level loading file.
  **After**: KEPT — **finding was partially wrong**. `(user)/layout.tsx:11` explicitly imports it (`import UserLoading from './loading'`) and renders it as the auth-loading screen (`if (loading) return <UserLoading />`, layout.tsx:22). Deleting it broke the build (`Module not found: Can't resolve './loading'`), so it was restored. Not dead; only the error.tsx half of M26 was actionable.

### M27 — dashboard hardcoded progress + N+1
- **`progressPct` hardcoded 0 (dashboard/page.tsx:55)**
  - **Before**: `progressPct: 0` fake value rendered via `ReadingProgress`.
  - **After**: removed. Progress % requires a total-chapter count; neither `Story` (`types/entities.ts` has no chapter-count field) nor reading history (`HistoryItem`: comicId/chapterId/chapterNumber/updatedAt) provides it, and the stories API doesn't return one. Per brief ("remove the progress bar rather than fake it") the bar and its `progressPct` field were deleted; `reading-progress.tsx` became orphaned (only consumer) and was deleted along with its `index.ts` re-export. `// ponytail:` comment names the missing source (total chapter count).
- **`latestChapter` never set (dashboard/page.tsx:145-149)**
  - **Before**: optional field never populated; guarded render block was permanent dead code ("Mới nhất: Chap …" never shown).
  - **After**: removed field + render block. No latest-chapter data exists in the Story model or the `/api/stories` responses; per brief ("otherwise remove the empty render path"). `// ponytail:` comment notes why.
- **N+1 `fetchStoryById` per story (dashboard/page.tsx:43-45)**
  - **Before**: `Promise.all(comicIds.map((id) => fetchStoryById(id)))` — 1 query per history item.
  - **After**: added `fetchStoriesByIds(ids)` to `story.service.ts` (single `in('id', ids)` query via the existing supabase fallback pattern — no raw supabase in the page, no apiClient batch endpoint exists). Dashboard now calls it once. `Story` import (was only used as a type guard) removed.

## Verification

- `npm run build` (frontend): PASS — compiled in ~5s, TypeScript clean, 42 static pages generated; `/user`, `/user/dashboard`, `/user/history`, `/user/bookmarks`, `/user/profile` all in route table.
- `npm run test:run`: PASS — 45 files, 385/385 tests (initial run had 3 failures in `f2_rsc_pages*` suites from the stale hardcoded server-page lists; both tier1 + tier2 fixtures updated to register `(user)/user/page.tsx`).
- `npm run lint`: PASS (echo script).

## Commit

`e2f903f` — conventional commit:
```
fix(user): restore /user route, drop faked dashboard progress, batch story fetch
```

### Deviations from brief
- `(user)/loading.tsx` NOT deleted (referenced by layout; brief's "confirm no references" check caught it — the reference is a relative `'./loading'` import).
- `reading-progress.tsx` + `index.ts` added to touched files (dead after progress removal).
- Test fixtures updated (required for green test run).
