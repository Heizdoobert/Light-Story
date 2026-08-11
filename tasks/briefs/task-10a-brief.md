# Task 10a: Fix Batch 4a — root error/SEO lows

## Description
Fix Low findings: L1/L3/L4 (not-found language + Link), L5 (robots stale paths), L7 (dead CSS token), F12 (StatusErrorPage Link), and the batch-3 reviewer minor (avatar 3xx handling).

## Acceptance criteria (findings.md authoritative; L2/L8 remain accepted notes — do NOT touch)
- [ ] L3 + L4 (`src/app/not-found.tsx`): plain `<a>` → `next/link` `Link`; align copy to Vietnamese (site default is VI — match `error.tsx`/`global-error.tsx` copy style: "Không tìm thấy trang" + a home link).
- [ ] L1 (`src/app/error.tsx`): hardcoded VI strings — site default IS VI, so this is consistent; SKIP code change, record acceptance note (i18n migration out of scope).
- [ ] L5 (`src/app/robots.ts`): remove stale `/dashboard` disallow (no such route); `/profile` — the route is public-by-design redirect; keep it disallowed (intentional). Use ROUTES constants where they exist.
- [ ] L7 (`src/app/globals.css:8`): delete the dead duplicate `--color-primary: #6366f1` line (shadowed by the later `@theme inline` one).
- [ ] F12 (`src/components/errors/StatusErrorPage.tsx:30`): back-home `<a href>` → `next/link` `Link` (component is used by the (errors) group pages).
- [ ] Batch-3 minor (`src/app/api/avatar/route.ts:60`): treat upstream 3xx as failure — `response.status >= 300 && < 400` → 502 (or 400) with clear error, instead of returning a JSON body with a 3xx status.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after + accepted notes
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/not-found.tsx`
- `frontend/src/app/robots.ts`
- `frontend/src/app/globals.css`
- `frontend/src/components/errors/StatusErrorPage.tsx`
- `frontend/src/app/api/avatar/route.ts`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Vietnamese copy: match existing phrasing in error.tsx/global-error.tsx.
- Minimal diffs. Report: `tasks/reports/task-10a-report.md`.
