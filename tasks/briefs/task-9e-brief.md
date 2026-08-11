# Task 9e: Fix Batch 3e — hook bugs (settings "false" + chapters delete tag)

## Description
Fix M28 (`"false"` parsed truthy in use-admin-settings) and M29 (wrong cache tag on chapter delete).

## Acceptance criteria (findings.md authoritative)
- [ ] M28: `src/hooks/features/use-admin-settings.ts:26` — `row.value === "true" || Boolean(row.value)` parses stored `"false"` as true. Fix: parse only explicit `"true"` (e.g. `row.value === "true"`) or use a strict boolean parser; a stored `"false"` must evaluate false. Check all call sites of that setting to confirm nothing depended on the buggy truthy behavior.
- [ ] M29: `src/hooks/features/use-admin-chapters.ts:137` — `deleteChapter(id, targetComicId)` uses the modal's last target comic instead of the row's `story_id`, revalidating the wrong cache tag. Fix: pass the row's `story_id` (from the chapter being deleted) so `revalidateTag` hits the correct story's tag. Verify the deleteChapter action signature and the row data available in the delete handler.
- [ ] `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report per-finding before/after
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/hooks/features/use-admin-settings.ts`
- `frontend/src/hooks/features/use-admin-chapters.ts`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Check the `deleteChapter` action signature in `src/lib/actions/chapter.actions.ts` (or wherever it lives) + how the row object is shaped in the delete handler before changing the call.
- Minimal diffs. Report: `tasks/reports/task-9e-report.md`.
