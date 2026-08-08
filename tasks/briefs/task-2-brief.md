# Task 2: Route structure audit + (auth)/layout.tsx

## Description
Audit the route structure of `frontend/src/app/` against PROJECT_RULES.md II.1 (route groups, URL prefixes, error/loading files per group, page.tsx presence). Then create the missing `(auth)/layout.tsx` per the Global Constraints.

## Acceptance criteria
- [ ] Audit table produced: every route dir has `page.tsx`; dynamic `[x]` dirs have sibling-matching layout/loading/error; each of the 5 groups + sublayouts checked; URL prefixes correct ((user) → /user, (admin) → /admin, (public)/(auth) → no prefix)
- [ ] `(auth)/layout.tsx` created — EXACT clone of `(public)/layout.tsx` chrome (Header + LoginModal + Footer, `'use client'`, identical imports/structure)
- [ ] NO page moves, NO changes to `(public)/auth/layout.tsx` or any other file
- [ ] `// ponytail: layout duplicated from (public); extract shared chrome only if a 3rd group needs it` comment at top of the new file
- [ ] Audit findings recorded with severity in the task report (no fixes in this task)

## Verification
- [ ] `npm run build` green (workdir D:\Light-Story\frontend)
- [ ] New file present: `frontend/src/app/(auth)/layout.tsx`

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(auth)/layout.tsx` (NEW — the only file change)

## Context / constraints
- `(auth)` currently has only error.tsx + loading.tsx, zero pages. That is fine — layout is for future pages. Do NOT move pages.
- `(public)/layout.tsx` is the template: it is a `'use client'` component with `useState` for the login modal, imports `Header` from `@/components/navigation/Header`, `PublicFooter` from `@/components/layout/public-footer`, `LoginModal` from `@/components/auth/login-modal`. Copy it verbatim (same file name/export structure), swap only the function name to `AuthLayout`.
- Route groups: `(public)` no auth; `(user)` auth required URL /user; `(admin)` admin URL /admin. `(auth)` and `(errors)` are public.
- Each group should have error.tsx + loading.tsx; `(errors)` group has pages but no layout — check and flag if that's an inconsistency.
- PowerShell shell, Windows paths. Commands in `D:\Light-Story\frontend`.
- Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-2-report.md` — contains the FULL audit table + findings (file, issue, severity, rule) + build result. If you find structural defects, list them but DO NOT fix them in this task.
