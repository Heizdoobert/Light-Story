# Task 10c: Fix Batch 4c — user/auth/errors lows + residual URLs + role source

## Description
Fix remaining Low findings: F10 (sidebar label), F13 (raw error.message in 2 error boundaries), F11 (actions dir note — no code), residual hardcoded URLs in HomePage/RecommendedComics, and align AuthContext role resolution with the server-side order.

## Acceptance criteria (findings.md authoritative)
- [ ] F10 (`src/components/layout/user-sidebar.tsx:11`): "Cài đặt tài khoản" links to `ROUTES.USER.DASHBOARD` — either retarget to the real settings location or rename the label to match the dashboard target (check if a user settings page exists; if none, rename label to the dashboard's meaning, e.g. "Bảng điều khiển" or similar).
- [ ] F13: `src/app/(user)/user/error.tsx:32` and `src/app/(auth)/error.tsx:26` — raw `error.message` → dev-only guard (same pattern as `src/app/error.tsx` after its 8b fix: show message only when `process.env.NODE_ENV === 'development'`).
- [ ] Residual URL literals (noted in task-9b report): `src/components/home/HomePage.tsx` and `src/components/home/RecommendedComics.tsx` — hardcoded `/comics/...` → `ROUTES.COMIC_DETAIL(...)` (helpers exist).
- [ ] AuthContext role source: `src/context/AuthContext.tsx:28-37` `resolveRole` prefers `profiles.role` over `app_metadata` — inverse of `use-user.ts` and the server (permission.ts/middleware use app_metadata first). Align: `app_metadata.role` → `user_metadata.role` → `profiles.role` fallback (match the order used in `use-user.ts` after task 9c). Verify no test depends on the old order (run tests; fix tests only if they assert the old precedence and the new order is correct).
- [ ] F11: note only — do NOT merge the two actions dirs.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/components/layout/user-sidebar.tsx`
- `frontend/src/app/(user)/user/error.tsx`
- `frontend/src/app/(auth)/error.tsx`
- `frontend/src/components/home/HomePage.tsx`
- `frontend/src/components/home/RecommendedComics.tsx`
- `frontend/src/context/AuthContext.tsx` (+ tests if they assert role precedence)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- AuthContext change is behavior-relevant for every client: keep it minimal — only the precedence order in resolveRole; do not touch anything else in the file.
- Minimal diffs. Report: `tasks/reports/task-10c-report.md`.
