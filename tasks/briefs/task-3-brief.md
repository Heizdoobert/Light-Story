# Task 3: API routes review

## Description
Review the 5 API routes under `frontend/src/app/api/` for auth, validation, and error-handling consistency per PROJECT_RULES. Report-only task — no fixes.

## Acceptance criteria
- [ ] Each route: HTTP method(s), purpose, and status recorded
- [ ] Every sensitive route has auth/role check (PROJECT_RULES I.8: role from `app_metadata.role` preferred, else `profiles.role`)
- [ ] Input validation via Zod from `lib/schemas/` (I.7) — no raw `req.json()` trust
- [ ] Webhook route verifies Supabase signature (II.1, IV)
- [ ] R2 routes protect assets (presigned/proxy auth) (IV)
- [ ] No client `fetch` to these internal routes from app/ code (III) — grep `fetch(` and `api/` references in `frontend/src/app` and `frontend/src/components` for violations
- [ ] `revalidateTag(` calls have 2 params (I.9) — grep
- [ ] `'use server'` misuse in route handlers (I.10) — grep
- [ ] Findings table: file:line, issue, severity (High/Med/Low), rule violated

## Verification
- [ ] Report file contains all findings (no fixes applied)

## Dependencies
None (read-only task).

## Files likely touched
- NONE (report only)

## Context / constraints
- Routes: `api/avatar/route.ts`, `api/health/route.ts`, `api/r2/proxy/route.ts`, `api/r2/upload/route.ts`, `api/webhooks/supabase/route.ts`.
- Check how other route handlers in the repo do auth (look at `lib/supabase/server.ts`, `middleware.ts` if needed) to judge consistency — but only report, don't fix.
- PowerShell shell; workdir D:\Light-Story\frontend.
- Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-3-report.md` — full per-route table + findings with severity + evidence (grep outputs).
