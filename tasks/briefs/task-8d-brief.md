# Task 8d: Fix Batch 2b — genres + (user) group Highs

## Description
Fix H4 (genre pages ignore slug), H5 (no auth guard on (user) group), H6 (profile bypasses server action + Zod).

## Acceptance criteria (findings.md authoritative)
- [ ] H4: `genres/[genreSlug]/page.tsx` must actually filter by the slug's genre:
  - Resolve slug → category: `Category` has NO slug field (types/entities.ts:33-39) — match by normalized name (`fetchCategories()` from `@/services/comics/taxonomy.service`, compare `slugify(category.name) === genreSlug` case-insensitively, or exact `name` match).
  - `SearchPageContent` currently takes no props and its presenter reads only `useSearchParams()` — extend it with an optional `initialCategory?: string` prop (defaulted to the matched category NAME, which is what the search backend's `category` param expects — verify against story.service.ts:12,87 before finalizing) so the genre page renders filtered results.
  - Unmatched/unknown slug → `notFound()`.
  - Keep `generateMetadata` in layout as-is (title from slug is fine).
- [ ] H5: `(user)/layout.tsx` adds a session guard: `useAuth()` → `{ user, loading }` (AuthContext). While `loading` → render a loading state (reuse the group's loading UI or skeleton); if `!user` → client-side redirect to `ROUTES.LOGIN` (via `useRouter` + `useEffect`, or `<RedirectType>` — do NOT use server `redirect()` in a 'use client' layout). Render `children` only when authenticated.
- [ ] H6: `user/profile/page.tsx` happy path routes through the existing Zod-validated server action `updateUserProfile` (`@/lib/actions/user.actions`) instead of writing `profiles` directly via browser supabase. Remove the direct write; keep the action as the single path (drop the "fallback" branch). Keep current UX (toast/success).
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(public)/genres/[genreSlug]/page.tsx`
- `frontend/src/components/comics/SearchPageContent.tsx`
- `frontend/src/hooks/features/useSearchPresenter.ts` (or wherever the presenter lives — verify)
- `frontend/src/app/(user)/layout.tsx`
- `frontend/src/app/(user)/user/profile/page.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Read `tasks/findings.md` + the T5 report (F1 details) for exact evidence.
- `useAuth` hook: check `src/context/AuthContext.tsx` exports (`{ user, loading, ... }`).
- `ROUTES.LOGIN` exists (`/auth/login`).
- Minimal diffs; follow existing patterns. If the category-param semantics differ from the brief's assumption, report DONE_WITH_CONCERNS with evidence rather than guessing.
- Report: `tasks/reports/task-8d-report.md`.
