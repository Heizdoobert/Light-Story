# Task 8a: Fix Batch 1a — api/ routes + Header

## Description
Fix High/Med findings from the compiled findings doc in `frontend/src/app/api/` and `frontend/src/components/navigation/Header.tsx`. Build+test after.

## Acceptance criteria (per finding — tasks/findings.md is authoritative)
- [ ] H7 (`Header.tsx:92`): replace dead `apiClient.get('/api/comics?...')` with `fetchStoriesPage({ keyword: trimmed, page: 1, pageSize: 6, sort: 'newest' })` from `@/services/comics/story.service` (exists, uses `ROUTES.API.STORIES`). Keep `.catch(() => null)` fallback. No behavior change to dropdown rendering.
- [ ] M2 (`api/avatar/route.ts:46`): cap upstream body before buffering (e.g. reject when `Content-Length` > 5MB or stream-limit via `arrayBuffer().then` guard on `response.headers.get('content-length')`); 503/400 with clear error on oversize. Add `redirect: 'manual'` + `response.redirected` reject (T3 F-03).
- [ ] M4 (`api/r2/upload/route.ts:77`): guard `file.size` against a sane in-memory ceiling (configurable const, default 50MB — covers cbz/zip; 250MB was the old cap) BEFORE `arrayBuffer()`. Add `// ponytail:` comment naming the ceiling + upgrade path (streaming multipart put).
- [ ] T3 F-07 (`api/r2/proxy/route.ts:56`): size-guard the buffered object (same const approach, e.g. 50MB); clear error if over.
- [ ] Notes (no code change, record in report): F-02/F-06 manual validation accepted (single-param routes, Zod marginal), F-08 octet-stream looseness accepted (extension allowlist is effective guard), F-10 webhook dev bypass accepted (prod protected) — each with one-line rationale.
- [ ] `npm run build` + `npm run test:run` green (workdir D:\Light-Story\frontend)

## Verification
- [ ] Build + tests pass
- [ ] Report: per-finding before/after + test output
- [ ] Commit (conventional style) — report short hash

## Dependencies
None.

## Files likely touched
- `frontend/src/components/navigation/Header.tsx`
- `frontend/src/app/api/avatar/route.ts`
- `frontend/src/app/api/r2/upload/route.ts`
- `frontend/src/app/api/r2/proxy/route.ts`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Read `tasks/findings.md` for the exact finding text.
- Minimal changes; no refactors beyond the fix; ponytail comments where a ceiling/shortcut is chosen.
- Report: `tasks/reports/task-8a-report.md`.
