# Task 9b: Fix Batch 3b — hardcoded URL templates

## Description
Replace 9 hardcoded URL templates with `ROUTES` constants (findings M11).

## Acceptance criteria
- [ ] `SearchPageContent.tsx:150` — `href={`/comics/${comic.id}`}` → `ROUTES.COMIC_DETAIL(comic.id)` (verify the exact helper signature in `src/lib/constants/routes.ts` first)
- [ ] `ComicDetailPageContent.tsx:94,105,204` — `href={`/comics/${comicId}/chapter/${id}`}` → `ROUTES.CHAPTER_READER(comicId, id)` (verify signature)
- [ ] `ChapterReaderPageContent.tsx:88,140,149,205,256` — same replacements
- [ ] No other changes; `npm run build` + `npm run test:run` green

## Verification
- [ ] Build + tests pass
- [ ] Report with before/after lines
- [ ] Commit (conventional) — report hash

## Dependencies
None.

## Files likely touched
- `frontend/src/components/comics/SearchPageContent.tsx`
- `frontend/src/components/comics/ComicDetailPageContent.tsx`
- `frontend/src/components/reader/ChapterReaderPageContent.tsx`

## Context / constraints
- PowerShell, workdir D:\Light-Story\frontend. Do not modify `opencode.json`.
- Read `src/lib/constants/routes.ts` first — use the EXACT existing helpers; if a needed helper doesn't exist, add it to routes.ts (it's the centralized place per I.6) — don't inline template strings.
- Report: `tasks/reports/task-9b-report.md`.
