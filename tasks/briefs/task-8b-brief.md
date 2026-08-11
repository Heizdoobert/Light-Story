# Task 8b: Fix Batch 1b — root files

## Description
Fix Med findings from findings.md in the 5 root files of `frontend/src/app/` + env docs.

## Acceptance criteria (findings.md is authoritative)
- [ ] M5 (`layout.tsx:9,12`): set `metadataBase` unconditionally — derive from `NEXT_PUBLIC_SITE_URL` with a safe default fallback (use `NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN` or the gateway URL; do NOT hardcode localhost in production paths — guard dev/prod: `process.env.NODE_ENV === 'production' ? (siteUrl || throw-warn) : new URL('http://localhost:3000')`). Add `NEXT_PUBLIC_SITE_URL` (documented, empty) to `.env.example`.
- [ ] M6 (`error.tsx:32`): guard `error.message` like `components/errors/ErrorBoundary.tsx:44` does — show message only when `process.env.NODE_ENV === 'development'`, else generic text.
- [ ] M7 (`global-error.tsx:19`): import `./globals.css` in global-error.tsx (or inline critical styles) so the UI renders styled in production.
- [ ] M8 (`sitemap.ts:5-15`): guard `BASE_URL` — if unset, mirror robots.ts behavior (omit sitemap URLs / return empty array with console.warn) instead of emitting "undefined" strings. Also drop auth pages (L6) from sitemap entries (login/register have no SEO value).
- [ ] `npm run build` + `npm run test:run` green (workdir D:\Light-Story\frontend)

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after + test output
- [ ] Commit (conventional) — report short hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/layout.tsx`
- `frontend/src/app/error.tsx`
- `frontend/src/app/global-error.tsx`
- `frontend/src/app/sitemap.ts`
- `frontend/.env.example`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json` or `.env.local`.
- Do not add new env-var hardcoding; follow existing robots.ts pattern for BASE_URL fallback.
- Minimal diffs. Report: `tasks/reports/task-8b-report.md`.
