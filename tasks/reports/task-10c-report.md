# Task 10c Report — Fix Batch 4c: user/auth/errors lows + residual URLs + role source

Status: DONE
Commit: `bb4f355cc1d29b83a0e9b1b8b5bb3afccd33c60d`
Branch: `preview`

## Findings fixed

### F10 — `src/components/layout/user-sidebar.tsx:11`
- **Before**: Label "Cài đặt tài khoản" (Account settings) linked to `ROUTES.USER.DASHBOARD`. No user settings page exists (`(user)/user/` only has profile/dashboard/history/bookmarks + index), so the label lied about the target.
- **After**: Label renamed to "Bảng điều khiển" to match the dashboard target. No retarget (nothing to retarget to).

### F13 — raw `error.message` in 2 error boundaries
- **Before**: `src/app/(user)/user/error.tsx:32` and `src/app/(auth)/error.tsx:26` rendered `error.message` unconditionally (leaks internals in prod).
- **After**: Both guard with `const isDevelopment = process.env.NODE_ENV !== "production"` and show `error.message` only in development, falling back to the localized generic message — same pattern as `src/app/error.tsx` (8b fix). `error.digest` display in the user boundary is unchanged.

### Residual URL literals — home components
- **Before**: `src/components/comics/HomePage.tsx` (note: actual path is `components/comics/`, not `components/home/` as the brief listed) had 5 hardcoded literals — 4× `href={`/comics/${comic.id}`}` + 1× `` href={`/comics/${comic.id}/chapter/${comic.chapterId}`} ``. `src/components/comics/RecommendedComics.tsx` had 1× `` `/comics/${comic.id}` ``.
- **After**: All replaced with `ROUTES.COMIC_DETAIL(comic.id)` / `ROUTES.CHAPTER_READER(comic.id, comic.chapterId ?? "")`. The `?? ""` is required because `HistoryComic.chapterId` is `string | undefined` and `CHAPTER_READER` is typed `(comicId: string, chapterId: string)`; the template literal previously coerced `undefined` silently. `ROUTES` import added to `RecommendedComics.tsx`.
- **Accuracy correction (fix round)**: the earlier draft's "Output is byte-identical to before" was wrong — the template literal produced `/comics/{id}/chapter/undefined` (broken link) while `?? ""` produces `/comics/{id}/chapter/` (also broken). Both link to a non-existent chapter when `chapterId` is missing; the change is no worse, not byte-identical.

### AuthContext role precedence — `src/context/AuthContext.tsx` `resolveRole` (lines 28-37)
- **Before**: `profiles.role` preferred, then `app_metadata.role` — inverse of `use-user.ts` and the server (`permission.ts` / `middleware` use `app_metadata` first, synced by DB trigger).
- **After**: `app_metadata.role` → `user_metadata.role` → `profiles.role`, matching `use-user.ts` after task 9c. Nothing else in the file touched. No tests assert the old precedence (grep for `resolveRole`/`app_metadata`/role assertions in `__tests__` and `*.test.*` found none).

### F11 — note only
- Two actions dirs NOT merged (out of scope, per plan).

## Verification
- `npm run build` (next build 16.3.0, Turbopack): PASS — 42/42 routes, no type errors.
- `npm run test:run` (vitest 4.1.10): PASS — 45 files / 385 tests.
- Lint hook on commit: PASS.

## Files changed (6)
- `frontend/src/components/layout/user-sidebar.tsx`
- `frontend/src/app/(user)/user/error.tsx`
- `frontend/src/app/(auth)/error.tsx`
- `frontend/src/components/comics/HomePage.tsx`
- `frontend/src/components/comics/RecommendedComics.tsx`
- `frontend/src/context/AuthContext.tsx`

Diff: 22 insertions(+), 13 deletions(-).

---

## Fix round (reviewer findings)

Status: DONE (fix subagent, batch-4 findings)
Commit: `6724069…` (fix round; see fix commit hash in final message)

### Findings fixed

1. **Important** — `admin/dashboard/page.tsx:121` faked default `?? 99.5` on Cache Hit Ratio removed → `infraStats?.cache_hit_ratio_pct != null ? \`${infraStats.cache_hit_ratio_pct}%\` : "—"` (honest-empty pattern from `admin/analytics/page.tsx:70`). Sibling static "Live" (:149-151) and "Bound" (:159-161) badges converted to the same "Chưa kiểm tra" treatment as the fixed "Worker API Gateway" row (:169-171) — no data source exists for either claim. Unused `CheckCircle2` import removed.
2. **Minor** — `admin/analytics/page.tsx:52,98` hardcoded `?? 10` GB fallback removed → "—" when `r2_allocated_gb` is null, matching the rest of the file.
3. **Minor** — report text corrected above: `chapterId ?? ""` output is `…/chapter/`, not byte-identical (was `…/chapter/undefined`) — both broken links, no worse.

### Test command + output

- `npm run build` (next build 16.3.0, Turbopack): **PASS** — 42/42 routes, no type errors.
- `npm run test:run` (vitest 4.1.10): **PASS** — 45 files / 385 tests, Duration 27.21s.
- No dedicated test file for these components exists; suite run is the gate per brief.

### Files changed (3)
- `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- `frontend/src/app/(admin)/admin/analytics/page.tsx`
- `tasks/reports/task-10c-report.md` (accuracy note + this section)
