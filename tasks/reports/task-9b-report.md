# Task 9b Report — Fix Batch 3b: hardcoded URL templates

**Status:** ✅ Done
**Commit:** `73447d1` — `refactor(app): centralize comic/chapter route URLs via ROUTES helpers (task 9b)`
**Date:** 2026-08-09

## Summary

Replaced 9 hardcoded `/comics/...` URL template literals with the centralized
`ROUTES` helpers across 3 files (finding M11, rule I.6). No changes to
`routes.ts` were required — both `COMIC_DETAIL(id)` and
`CHAPTER_READER(comicId, chapterId)` already existed with the exact needed
signatures. All 3 files already imported `ROUTES`.

## Per-line before/after

### `src/components/comics/SearchPageContent.tsx` (1 change)

| Before (L152) | After |
|---|---|
| `href={`/comics/${comic.id}`}` | `href={ROUTES.COMIC_DETAIL(comic.id)}` |

### `src/components/comics/ComicDetailPageContent.tsx` (3 changes)

| Before | After |
|---|---|
| `? `/comics/${comicId}/chapter/${firstChapter.id}` (L94) | `? ROUTES.CHAPTER_READER(comicId, firstChapter.id)` |
| `? `/comics/${comicId}/chapter/${latestChapter.id}` (L105) | `? ROUTES.CHAPTER_READER(comicId, latestChapter.id)` |
| `href={`/comics/${comicId}/chapter/${chapter.id}`}` (L204) | `href={ROUTES.CHAPTER_READER(comicId, chapter.id)}` |

### `src/components/reader/ChapterReaderPageContent.tsx` (5 changes)

| Before | After |
|---|---|
| `href={`/comics/${comicId}`}` (L88) | `href={ROUTES.COMIC_DETAIL(comicId)}` |
| `prevChapter ? `/comics/${comicId}/chapter/${prevChapter.id}` : "#"` (L140) | `prevChapter ? ROUTES.CHAPTER_READER(comicId, prevChapter.id) : "#"` |
| `nextChapter ? `/comics/${comicId}/chapter/${nextChapter.id}` : "#"` (L149) | `nextChapter ? ROUTES.CHAPTER_READER(comicId, nextChapter.id) : "#"` |
| `prevChapter ? `/comics/${comicId}/chapter/${prevChapter.id}` : "#"` (L205) | `prevChapter ? ROUTES.CHAPTER_READER(comicId, prevChapter.id) : "#"` |
| `nextChapter ? `/comics/${comicId}/chapter/${nextChapter.id}` : "#"` (L256) | `nextChapter ? ROUTES.CHAPTER_READER(comicId, nextChapter.id) : "#"` |

## `routes.ts` additions

None — `COMIC_DETAIL(id: string)` (L8) and
`CHAPTER_READER(comicId: string, chapterId: string)` (L9-10) already existed
with matching signatures.

## Verification

### Build (`npm run build`)

```
✓ Compiled successfully in 5.5s
  Running TypeScript ... Finished TypeScript in 7.6s
✓ Generating static pages using 11 workers (41/41) in 1686ms
```
All 41 routes built, no errors.

### Tests (`npm run test:run`)

```
Test Files  45 passed (45)
     Tests  385 passed (385)
   Duration  28.53s
```

### Lint (pre-commit hook)

`Lint ok` — passed automatically on commit.

## Scope notes

- Grep confirms zero remaining `/comics/${...}` template literals in the 3
  target files.
- Remaining hardcoded literals in `HomePage.tsx` (5×) and
  `RecommendedComics.tsx` (1×) are **out of scope** for this batch — brief
  explicitly lists only the 9 lines above ("No other changes").
- `opencode.json` and unrelated `tasks/` files were left unmodified/unstaged.

## Concerns

None. Both helpers were already present; strictly a mechanical swap.
