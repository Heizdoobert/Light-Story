# Task 10b: Fix Batch 4b — admin lows + reviewer minors

## Description
Fix admin Low findings (F18-F24) + two batch-3 reviewer minors (avatar 3xx already done in 10a — NOT here; story fetch order IS here).

## Acceptance criteria (findings.md authoritative)
- [ ] F18 (`admin/profile/page.tsx:83`): hardcoded fallback email `admin@lightstory.app` — remove the fake fallback; render nothing/placeholder when `user?.email` missing.
- [ ] F19 (`(admin)/not-found.tsx`): replace stock boilerplate — Vietnamese copy consistent with admin group, `ROUTES.HOME` via `next/link` (no hardcoded `/`).
- [ ] F21 (`admin/dashboard/page.tsx:132-138`): remove the hardcoded "KẾT NỐI SẮC NÉT (Active)"/"Port 8787" block presented as live state — replace with a real empty state or remove; `// ponytail:` note if connectivity is genuinely undisplayed.
- [ ] F22 (`admin/analytics/page.tsx`): hardcoded default percentages (65/30/5%, 99.5%, 4.2ms) shown as real — replace with honest empty states (dash or "Chưa có dữ liệu").
- [ ] F23 (same file): `top_zones` empty array renders header-only table — add empty-state row.
- [ ] F24 (`(admin)/layout.tsx:17-24`): inline 403 screen — keep (it's the fallback when middleware didn't redirect), but simplify to match convention: use `ROUTES.ERROR.FORBIDDEN` link if it makes sense; at minimum ensure it uses `next/link` + ROUTES (judge minimal fix).
- [ ] Reviewer minor (`story.service.ts:68` fetchStoriesByIds): preserve input order — sort fetched rows by the input `ids` index after fetch (or map by id). Also: total failure currently returns `[]` silently — acceptable, add `// ponytail:` note.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(admin)/admin/profile/page.tsx`
- `frontend/src/app/(admin)/not-found.tsx`
- `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- `frontend/src/app/(admin)/admin/analytics/page.tsx`
- `frontend/src/app/(admin)/layout.tsx`
- `frontend/src/services/comics/story.service.ts`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Vietnamese copy consistent with the admin group's existing strings.
- Honest empty states > faked numbers. Minimal diffs. Report: `tasks/reports/task-10b-report.md`.
