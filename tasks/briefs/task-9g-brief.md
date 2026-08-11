# Task 9g: Fix Batch 3g — profile dedup + user-group URL templates

## Description
Fix M24 (duplicate profile UI) and M25 (hardcoded URLs in user components).

## Acceptance criteria (findings.md authoritative)
- [ ] M24: `(user)/user/profile/page.tsx` duplicates the canonical `src/components/user/ProfilePageContent.tsx` (which uses useAuth + useProfilePresenter + sanitizeImageUrl/proxyAvatarUrl). Fix: make the page delegate to `ProfilePageContent` (thin wrapper), OR make the page use the same presenter/sanitize path. VERIFY the component is compatible (props/behavior, including the Zod+action save from H6's fix — the page must still route saves through `updateUserProfile`). If ProfilePageContent has divergent behavior (e.g. its own save path that bypasses the action), reconcile it to use the action too. Delete the duplicated UI code.
- [ ] M25: `ReadingHistoryDrawer.tsx:40`, `UserReadingHistoryPageContent.tsx:65,77`, `UserBookmarksPageContent.tsx:54,62` — hardcoded `/comics/...` URLs → `ROUTES.COMIC_DETAIL(...)` / `ROUTES.CHAPTER_READER(...)` helpers (exist from Task 9b).
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(user)/user/profile/page.tsx`
- `frontend/src/components/user/ProfilePageContent.tsx` (only if its save path needs reconciliation)
- `frontend/src/components/user/ReadingHistoryDrawer.tsx`
- `frontend/src/components/user/UserReadingHistoryPageContent.tsx`
- `frontend/src/components/user/UserBookmarksPageContent.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Careful: the profile page already went through H6 (action-based save) in a prior batch — do not regress that. If ProfilePageContent's save path differs, align it to `updateUserProfile` too.
- Minimal diffs. Report: `tasks/reports/task-9g-report.md`.
