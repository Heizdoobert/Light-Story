# Task 7: (user) + (auth) + (errors) group review

## Description
Review all files in `frontend/src/app/(user)/`, `(auth)/`, `(errors)/` for bugs, dead code, conventions. Report-only — no fixes.

## Acceptance criteria
- [ ] Every file read: (user)/error, layout, loading + user/{error,loading,bookmarks,dashboard,history,profile}; (auth)/error, loading, NEW layout.tsx; (errors)/forbidden, handle-exception/{400,401,403,404,503}, unauthorized
- [ ] `(user)/layout.tsx` checks auth (II.1 — session required, URL /user)
- [ ] Pages thin, services/actions used; no hardcoded URLs (I.6); Zod on forms (I.7); no server-client leaks (III)
- [ ] `(auth)/layout.tsx` = verified clone of (public)/layout.tsx chrome with AuthLayout name + ponytail comment (from Task 2 — verify it exists and matches, do not modify)
- [ ] `(errors)` group: pages consistent (status codes correct, back-home links use routes.ts), missing layout/error/loading flagged (T2 MEDIUM — confirm)
- [ ] Findings table: file:line, issue, severity, rule ID

## Verification
- [ ] Report written; zero code changes

## Dependencies
None.

## Files likely touched
- NONE (report only)

## Context / constraints
- (user) group = logged-in space, URL prefix /user; (auth) = public empty group (layout only); (errors) = public error pages.
- T2 flagged: `/user` has no page.tsx → 404 (MEDIUM); (errors) group lacks layout/error/loading (MEDIUM). Verify both, restate as findings.
- PowerShell shell; workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-7-report.md` — per-file verdict + findings (file:line, issue, severity, rule ID).
