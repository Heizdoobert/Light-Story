# Task 9f: Fix Batch 3f — (user) group structure + dashboard

## Description
Fix M23 (/user 404), M26 (dead error/loading files), M27 (dashboard hardcoded progress + N+1).

## Acceptance criteria (findings.md authoritative)
- [ ] M23: create `frontend/src/app/(user)/user/page.tsx` — `/user` currently 404s. Minimal fix: thin redirect to `ROUTES.USER.DASHBOARD` (server component, `redirect(ROUTES.USER.DASHBOARD)` — same pattern as `(public)/profile/page.tsx`).
- [ ] M26: delete `frontend/src/app/(user)/error.tsx` and `frontend/src/app/(user)/loading.tsx` (dead: no page at that segment; `user/` provides its own). Confirm no references before deleting.
- [ ] M27: `frontend/src/app/(user)/user/dashboard/page.tsx`:
  - `progressPct` hardcoded 0 → compute real progress if the data is available (check the presenter/hook it uses — if progress data doesn't exist in the data model, remove the progress bar rather than fake it, or leave 0 with a `// ponytail:` comment naming the missing source).
  - `latestChapter` never set → populate from the same data source the story list uses if available; otherwise remove the empty render path (`// ponytail:` note).
  - N+1 `fetchStoryById` per story (`:43-45`) → batch: if a `fetchStories`/`fetchStoriesPage` with ids exists use it; otherwise a single `in`-query via the existing service (check story.service for a batch fetch) — do NOT write raw supabase inline if a service exists.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(user)/user/page.tsx` (NEW)
- `frontend/src/app/(user)/error.tsx` (DELETED)
- `frontend/src/app/(user)/loading.tsx` (DELETED)
- `frontend/src/app/(user)/user/dashboard/page.tsx`
- possibly `frontend/src/services/comics/story.service.ts` (batch fetch — only if none exists)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Check `ROUTES.USER.DASHBOARD` exists. Check the dashboard's hook/presenter for what data IS available before deciding compute-vs-remove for progressPct/latestChapter.
- Minimal diffs; prefer deleting faked UI over keeping hardcoded values.
- Report: `tasks/reports/task-9f-report.md`.
