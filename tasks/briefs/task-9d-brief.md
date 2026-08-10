# Task 9d: Fix Batch 3d — admin users/categories/settings/ads pages

## Description
Fix M19/M20 (modal scroll), M21 (hardcoded supabase URL), M22 (ad markup client-only), F25 (superadmin option), M22-related server-side enforcement.

## Acceptance criteria (findings.md authoritative)
- [ ] M19: `admin/users/page.tsx:121` — role-change modal container gets `max-h-[90vh]` + `overflow-y-auto` (CLAUDE.md modal standard).
- [ ] M20: `admin/categories/page.tsx:82` — category modal gets `max-h-[90vh]` + `overflow-y-auto`.
- [ ] F25: `admin/users/page.tsx:148` — hide "Super Admin" role option unless current user is superadmin (match the server-side gate in user.actions.ts:61; get role from the same source the page already uses).
- [ ] M21: `admin/settings/page.tsx:111` — hardcoded `https://xgtlrztskoomimvfpdoy.supabase.co` derived from env (`NEXT_PUBLIC_SUPABASE_URL`) instead of a literal.
- [ ] M22: `admin/ads/page.tsx` + `use-admin-ads.ts` — enforce the ad-markup policy (`validateAdMarkup`: allowed hosts, blocked terms) SERVER-side: the saving server action (find it — likely `saveSiteSettings` in lib/actions/settings.actions or similar) must run the same policy check and reject markup that violates it, so the server can't persist ad/casino/fraud markup. Client-side check stays as UX pre-check. Look at `validateAdMarkup` implementation first and reuse it server-side.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(admin)/admin/users/page.tsx`
- `frontend/src/app/(admin)/admin/categories/page.tsx`
- `frontend/src/app/(admin)/admin/settings/page.tsx`
- `frontend/src/app/(admin)/admin/ads/page.tsx`
- `frontend/src/lib/actions/settings.actions.ts` (or wherever saveSiteSettings lives)
- `frontend/src/hooks/features/use-admin-ads.ts` (if policy helper lives there — move/reuse server-side)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Find `validateAdMarkup` (T6 report cites use-admin-ads.ts:90-99) — if it's client-side only, move/share the pure logic (e.g. into `src/lib/` so both client pre-check and server action can use it — it must be usable in a 'use server' file, so keep it in a non-'use server' module).
- Minimal diffs. Report: `tasks/reports/task-9d-report.md`.
