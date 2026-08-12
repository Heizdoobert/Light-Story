# Implementation Plan: Admin Comic/Chapter Upload Fixes (7 Issues)

## Overview
Fix 7 admin issues in frontend/: DB-loaded dropdowns (no silent empty), required chain author/translator → category → comic → chapter, cbz filename auto-fill, bulk multi-chapter upload, real drag-drop, search suggestion 7 rows. Doubt-driven cycle already reconciled 13 adversarial-review findings into this design.

## Architecture Decisions
- **Text-column linkage** (doubt finding 1): selects write name strings to `author`/`translator` text columns. NO FK writes — `stories.author_id` FKs to `profiles` (mvp_init L2190), re-pointing needs migration + data fix. Zero migration, zero backend change.
- **Sequential inserts, parallel uploads** (findings 3/11): R2 cbz processing parallel (concurrency 3, bulk mode only), chapter creation serialized via promise-chain ref with local counter from dedicated `max(chapter_number)` query — no race on `UNIQUE(story_id, chapter_number)`.
- **Bulk mode isolated** (finding 4): `bulkChapters` prop — cbz never merges into preview/`onImagesUploaded` in bulk mode.
- **No new deps**, plain `<select>` stays.

## Task List

### Task 1: Uploader — drag-drop + cbz callbacks
Refactor `image-uploader.tsx`: extract `processFiles(files)`; real drag-drop (onDragOver/onDragLeave/onDrop, preventDefault, highlight); in-flight guard; pure helpers `cbzBasename`/`isCbzFile` in `src/lib/r2/cbz-name.ts` (lowercase ext fixes `.CBZ`); props `onCbzName(name)`, `onCbzProcessed(name, urls)` (fires only on success), `bulkChapters` (cbz + images skip merged preview/onImagesUploaded; cbz sorted by name, processed with concurrency 3).

**Acceptance:**
- [ ] Drop cbz → same handling as file input; drag highlight; double-drop guarded
- [ ] `.CBZ` detected; `foo.cbz` → `onCbzName("foo")`; failed zip fires nothing
- [ ] `bulkChapters`: nothing appended to previews/onImagesUploaded

**Verification:** unit test for helpers; `npm test`; manual drag
**Deps:** None. **Files:** `components/admin/image-uploader.tsx`, `lib/r2/cbz-name.ts`, test

### Task 2: Options hook — categories/authors/translators
`use-admin-form-options.ts`: apiClient fetch (categories `/api/categories`, authors `ROUTES.API.ADMIN.TAXONOMY('author')`, translators `/api/admin/translators`), supabase table fallback on failure, error toast when all fail, `active` unmount guard.

**Acceptance:**
- [ ] 3 lists load; single failure → silent fallback; all-fail → toast + empty
- [ ] No setState after unmount

**Verification:** `npm test`; manual (gateway down → fallback works)
**Deps:** None. **Files:** 1 new

### Task 3: Comic form — required chain
Comic modal: author + translator DB `<select>`s (name values) + category select from hook (kills silent empty list). Submit blocked unless `author || translator` AND `category`; save disabled while options loading or authors+translators both empty (toast "thêm tác giả trước") or categories empty. Edit pre-selects by name match. Schema: + `translator` string; action writes `translator`.

**Acceptance:**
- [ ] Save only when author-or-translator AND category chosen; error toasts otherwise
- [ ] Empty DB lists → save disabled with guidance toast
- [ ] Edit of old text-only comic keeps text, no data loss

**Verification:** `npm test`; manual create/edit
**Deps:** Task 2. **Files:** `comics/page.tsx`, `use-admin-comics.ts`, `lib/schemas/comic.ts`, `lib/actions/comic.actions.ts`

### Task 4a: Auto-fill title from cbz
Chapters modal: `onCbzName` → `setTitle(name)` when creating (not editing).

**Acceptance:**
- [ ] Pick `foo.cbz` → title auto-filled `foo`
- [ ] No-op in edit mode

**Deps:** Task 1. **Files:** `chapters/page.tsx`

### Task 4b: Bulk upload — N cbz = N chapters
Chapters modal `bulkChapters` when `!editingChapter`: `onCbzProcessed` → serialized `createChapter` (promise-chain ref), number from per-story counter ref (first use: query `max(chapter_number)` for target story, reset when story changes), title = filename, toast per chapter, reload list after each. Guards: no comics / empty `targetComicId` → toast + abort.

**Acceptance:**
- [ ] 5 cbz → 5 chapters, titles = filenames, numbers = base+1..base+5 in filename order
- [ ] UNIQUE never violated; failed zip → toast, skipped, others proceed
- [ ] Edit mode + cover uploader unaffected

**Verification:** `npm test`; manual 5-file drop; network shows serial creates
**Deps:** Task 1, 4a. **Files:** `chapters/page.tsx`, `use-admin-chapters.ts`

### Task 5: Search suggestion 7 rows
Header autocomplete `pageSize: 6` → `7`.

**Acceptance:**
- [ ] Dropdown shows up to 7 suggestions

**Deps:** None. **Files:** `components/navigation/Header.tsx`

## Checkpoint: Tasks 1–5 complete
- [ ] `npm test` full suite green (321 baseline)
- [ ] `npm run lint` 0 errors; `npx tsc --noEmit` clean
- [ ] Manual: chain-order create, bulk 5 cbz, drag-drop, search 7 rows
- [ ] Human review before done

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| chapter_number collision on UNIQUE | High | sequential inserts + per-story max query + local counter |
| Drag-drop double-fire via label/input | Med | in-flight guard in `processFiles` |
| cbz processing speed | Med | concurrency 3 in bulk; page uploads inside cbz stay sequential |
| Tests break | Med | tier2 r2 tests untouched; helpers pure-tested |

## Open Questions
None — resolved in doubt cycle (FK decision: text-only, no migration).
