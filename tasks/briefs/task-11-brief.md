# Task 11: Feature — real auth pages (login / register / forgetPassword)

## Description
User decision (checkpoint B): replace the placeholder stub pages at `(public)/auth/login`, `(public)/auth/register`, `(public)/auth/forgetPassword` with REAL working auth pages. They must mirror the exact behavior of the existing LoginModal flow (which is the app's current auth UX) — same auth calls, same validation, same error messages.

## Acceptance criteria
- [ ] `/auth/login` renders a working login form: email + password → sign in (same mechanism LoginModal uses — inspect `src/components/auth/login-modal.tsx` and mirror its supabase/auth call + error handling exactly)
- [ ] `/auth/register` renders a working register form: email + password (min 6) + confirm → sign up (mirror LoginModal's register flow; validate with the schema from `src/lib/schemas/auth.ts` created in task 9a — reuse, do not duplicate)
- [ ] `/auth/forgetPassword` renders a working forgot-password form: email → reset email (mirror LoginModal's forgot flow if it has one; if the modal only links to `reset-password`, wire the supabase `resetPasswordForEmail` call with the same redirect-to URL the modal uses)
- [ ] All three forms validate with Zod (`lib/schemas/auth.ts` — extend it if the login schema needs fields beyond what task 9a added, e.g. `signInSchema`; reuse `resetPasswordSchema`)
- [ ] Success handling mirrors the modal: toast or inline success + redirect to `ROUTES.USER.DASHBOARD` after sign-in (check what the modal does post-login and match)
- [ ] Metadata: each page gets `generateMetadata` (title/description per page — SEO rule II.1)
- [ ] Keep existing links: pages link to each other (login ↔ register) via `ROUTES.*` constants (I.6 — add missing ROUTES.LOGIN/REGISTER/FORGET_PASSWORD entries to `lib/constants/routes.ts` if absent)
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Manual-check note in report: what a user sees at each route
- [ ] Commit (conventional) — report hash

## Dependencies
Task 9a (auth schema exists).

## Files likely touched
- `frontend/src/app/(public)/auth/login/page.tsx`
- `frontend/src/app/(public)/auth/register/page.tsx`
- `frontend/src/app/(public)/auth/forgetPassword/page.tsx`
- `frontend/src/components/auth/login-modal.tsx` (reference only — do NOT change the modal)
- `frontend/src/lib/schemas/auth.ts` (extend if needed)
- `frontend/src/lib/constants/routes.ts` (add ROUTES entries if missing)
- maybe a shared `src/components/auth/` form component if the 3 pages share structure (judge — a small shared `AuthFormShell` only if all 3 share enough)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- THE MODAL IS THE SOURCE OF TRUTH: mirror its auth calls, error handling, and success behavior exactly. Read it fully first. Do not invent new auth flows.
- Follow the site's copy conventions (Vietnamese) and the toast pattern used in admin pages.
- Do NOT touch `(auth)/` route group (future placeholder) or `(public)/auth/reset-password` (already working).
- Minimal diffs; no new dependencies. Report: `tasks/reports/task-11-report.md`.
