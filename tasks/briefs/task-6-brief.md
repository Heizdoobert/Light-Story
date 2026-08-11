# Task 6: (admin) group review

## Description
Review all 20 files in `frontend/src/app/(admin)/` for bugs, dead code, conventions. Report-only — no fixes.

## Acceptance criteria
- [ ] Every file in (admin) group read (admin layout/loading/error + admin/* pages: dashboard, comics CRUD + new + [comicId], chapters + [chapterId], users, categories, ads, analytics, audit, settings, profile)
- [ ] `(admin)/layout.tsx` checks auth + admin role (II.1 — role from app_metadata.role preferred, else profiles.role)
- [ ] Pages thin — mutations/actions via services or actions, not inline business logic (II.1)
- [ ] No hardcoded URLs (I.6); Zod on any form inputs (I.7); `revalidateTag(` 2-param (I.9); no server-client leaks (III)
- [ ] Data tables wrapped `overflow-x-auto`; modals `max-h-[90vh]`+`overflow-y-auto` (CLAUDE.md)
- [ ] Dynamic segments ([comicId], [chapterId]) sibling layout/loading/error checked (T2 flagged LOW: missing — confirm in report)
- [ ] Findings table: file:line, issue, severity, rule ID

## Verification
- [ ] Report written; zero code changes

## Dependencies
None.

## Files likely touched
- NONE (report only)

## Context / constraints
- Known from T2: `(admin)` dynamic segments lack sibling error/loading (LOW finding) — verify + keep as finding.
- PowerShell shell; workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-6-report.md` — per-file verdict + findings (file:line, issue, severity, rule ID).
