# Task 5: (public) group review

## Description
Review all 21 files in `frontend/src/app/(public)/` for bugs, dead code, and PROJECT_RULES compliance. Report-only — no fixes.

## Acceptance criteria
- [ ] Every file in (public) group read and assessed (home, comics list/detail, chapter reader, genres, search, auth pages, profile, layouts/loading/error files)
- [ ] No hardcoded URLs — `lib/constants/routes.ts` used (I.6); grep `href="/` and `router.push("`/` in group
- [ ] Form inputs validated with Zod `lib/schemas/` (I.7) — auth pages (login/register/forget/reset) especially
- [ ] No business logic in pages/layouts — services/actions used (II.1)
- [ ] `generateMetadata` used for dynamic routes (II.1: comics/[comicId], genres/[genreSlug], chapter)
- [ ] `revalidateTag(` 2-param (I.9); no `'use server'` misuse (I.10); no server-client imports into client components (III)
- [ ] Modals `max-h-[90vh]`+`overflow-y-auto`; tables `overflow-x-auto` (CLAUDE.md)
- [ ] Dynamic segment dirs have sibling layout/loading/error matching (II.1)
- [ ] Findings table: file:line, issue, severity, rule ID

## Verification
- [ ] Report written; zero code changes

## Dependencies
None.

## Files likely touched
- NONE (report only)

## Context / constraints
- Files (from tree): (public)/error.tsx, layout.tsx, loading.tsx, page.tsx; auth/{error,layout,forgetPassword,login,register,reset-password}/page.tsx; comics/{layout,page,[comicId]/{error,layout,loading,page}}; comics/[comicId]/chapter/[chapterId]/{error,layout,loading,page}; genres/[genreSlug]/{error,layout,loading,page}; profile/page.tsx; search/page.tsx.
- Known context: (public)/layout.tsx is the chrome template (Header+LoginModal+Footer) — it was already reviewed as the (auth) clone source in Task 2; you may skim it, focus effort on pages.
- PowerShell shell; workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Report file: `D:\Light-Story\tasks\reports\task-5-report.md` — per-file verdict + findings (file:line, issue, severity, rule ID).
