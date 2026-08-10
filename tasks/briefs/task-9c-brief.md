# Task 9c: Fix Batch 3c — admin role source + comic CRUD pages

## Description
Fix M12 (role source mismatch in admin layout), M13/M14/M15 (comics new + edit pages), plus same-file lows F16/F17.

## Acceptance criteria (findings.md authoritative)
- [ ] M12: `(admin)/layout.tsx` role resolution must consult `app_metadata.role` (preferred) before `profiles.role` — align `use-user.ts:29-38` (or the layout's role source) with the middleware/permission.ts pattern (`app_metadata.role` first, profiles fallback). Role for admin gate must agree with server-side guard.
- [ ] M13 + F16: `admin/comics/new/page.tsx` — remove dead `description` state (never submitted) OR add `description` to `createComic` + `createComicSchema` if the schema supports it (check `lib/schemas/comic.ts` — if the backend/story model has description, include it; if not, delete the dead state). Replace hardcoded `status: 'ongoing'` with a proper form field/constant (check existing status constants).
- [ ] F17: same file — surface `createComic` failure to the user (toast/inline error, matching the toast pattern used in the chapters page).
- [ ] M14: `admin/comics/[comicId]/page.tsx` — replace the inline `useEffect` supabase read with loading/error states (keep the read if no service exists — see note), add loading + error UI so a failed fetch never shows a silent empty form.
- [ ] M15: same file — include `description` in `updateComic(comicId, ...)` (add to schema/action if the story model supports it; if the schema lacks the field, extend `updateComicSchema` + the action — check `lib/schemas/comic.ts` and `lib/actions`).
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(admin)/layout.tsx` (+ `src/hooks/features/use-user.ts` if that's the role source)
- `frontend/src/app/(admin)/admin/comics/new/page.tsx`
- `frontend/src/app/(admin)/admin/comics/[comicId]/page.tsx`
- possibly `frontend/src/lib/schemas/comic.ts` + comic actions (if description support added)

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Check `lib/security/permission.ts:37-40` + `middleware.ts:86-88` for the app_metadata-preferred pattern; mirror it.
- If the story model/backend genuinely has no description field, deleting dead state is the correct fix — verify first, report the decision.
- Report: `tasks/reports/task-9c-report.md`.
