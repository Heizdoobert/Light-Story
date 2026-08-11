# Task 8c: Fix Batch 2a — admin Highs

## Description
Fix the 3 High + 2 same-file Med findings in the admin chapter-edit and audit pages.

## Acceptance criteria (findings.md authoritative)
- [ ] H1 (`admin/chapters/[chapterId]/page.tsx`): page loads the existing chapter before render (via the same service/action path used elsewhere — check `comicCms.service`/`chapter.service` for a fetch; init `chapterNumber`/`title` from loaded data). No save runs before data loads.
- [ ] H2 (same file): remove `storyId = '1'` fallback — if the chapter lookup fails, abort (error state), never mutate with a garbage storyId. Revalidate with the REAL storyId from the loaded chapter.
- [ ] M16 (same file): submit path gets user-visible success/error feedback (toast or inline); no silent `finally`-only handling. If `updateChapter` fails, tell the user.
- [ ] M17 (same file): `ImageUploader` receives `onImagesUploaded` — persist uploaded images via the existing `updateChapterImages`/chapter-images path (check how `admin/comics` new/chapter flow persists images elsewhere; do NOT leave orphans).
- [ ] H3 (`admin/audit/page.tsx`): delete the fabricated fallback entries (`{id:'1', action:'CREATE_STORY'...}` etc.); render a real empty state when no rows.
- [ ] M18 (same file): loading state while fetching + user-facing error (toast/inline) instead of console.error-only.
- [ ] `npm run build` + `npm run test:run` green (workdir D:\Light-Story\frontend)

## Verification
- [ ] Build + tests pass
- [ ] Report: per-finding before/after
- [ ] Commit (conventional) — report short hash

## Dependencies
None.

## Files likely touched
- `frontend/src/app/(admin)/admin/chapters/[chapterId]/page.tsx`
- `frontend/src/app/(admin)/admin/audit/page.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Read `tasks/findings.md` for exact finding text. Follow existing patterns in the same file/compo-group (check `admin/comics/new` and `admin/comics/[comicId]` for the chapter-image persistence pattern before inventing one).
- Minimal diffs. Report: `tasks/reports/task-8c-report.md`.
