# Task 9a: Fix Batch 3a — auth Zod schema + duplicate metadata

## Description
Add a Zod auth schema (root fix for M9) and drop the duplicate generateMetadata (M10).

## Acceptance criteria (findings.md authoritative)
- [ ] M9: create `frontend/src/lib/schemas/auth.ts` (NO 'use server'; usable client+server per lib/schemas convention) with a password schema (e.g. min 6 chars — match existing behavior at ResetPasswordPage.tsx:40-48 and login-modal.tsx:62-79) and `resetPasswordSchema` (password + confirmPassword, refine `password === confirmPassword`). Wire `ResetPasswordPage.tsx` (src/components/auth/) to validate with the schema; wire `login-modal.tsx`'s manual password checks to the same schema. Error messages stay user-facing and match existing copy.
- [ ] M10: remove `generateMetadata` from `src/app/(public)/comics/[comicId]/page.tsx` — keep the one in `[comicId]/layout.tsx` (it has the fuller OG/description set). Page keeps whatever else it has; no double queries after.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/lib/schemas/auth.ts` (NEW)
- `frontend/src/components/auth/ResetPasswordPage.tsx`
- `frontend/src/components/auth/login-modal.tsx`
- `frontend/src/app/(public)/comics/[comicId]/page.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Look at an existing schema in `src/lib/schemas/` (e.g. user.ts or webhook.ts) and mirror its style (zod v4 or v3 pattern as used there).
- Minimal diffs. Report: `tasks/reports/task-9a-report.md`.
