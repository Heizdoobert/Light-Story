# Task 9e Report — Fix batch 3e (hook bugs: settings "false" + chapters delete tag)

Status: DONE. Commit: `a2046fff142fa1639d65002482fd512e1719a9f3`

## M28 — `"false"` string parsed truthy in use-admin-settings

Location: `frontend/src/hooks/features/use-admin-settings.ts:26-27`

Before:
```ts
if (row.key === "maintenance_mode") setMaintenanceMode(row.value === "true" || Boolean(row.value));
if (row.key === "compact_mode") setCompactMode(row.value === "true" || Boolean(row.value));
```
`Boolean("false") === true`, so a stored `"false"` evaluated as `true` — boolean settings could never be turned off.

After:
```ts
if (row.key === "maintenance_mode") setMaintenanceMode(row.value === "true");
if (row.key === "compact_mode") setCompactMode(row.value === "true");
```
Only the literal `"true"` string is true; `"false"` → `false`, any other value → `false`.

Call-site audit: the only consumer of this hook is `src/app/(admin)/admin/settings/page.tsx`, which binds the returned booleans to `checked={maintenanceMode}` / `checked={compactMode}`. Nothing depended on the buggy truthy behavior (a previously "stuck on" checkbox is the symptom being fixed). The save path already stores `String(bool)`, so round-trips are consistent.

## M29 — chapter delete revalidates wrong story cache tag

Location: `frontend/src/hooks/features/use-admin-chapters.ts:137` (+ caller `frontend/src/app/(admin)/admin/chapters/page.tsx:131`)

Before:
```ts
const handleDeleteChapter = async (id: string, chNum: number) => {
  ...
  const res = await deleteChapter(id, targetComicId);
```
`targetComicId` is the modal's last-target story, not the deleted chapter's story — `deleteChapter`'s `revalidateTag(CACHE_TAGS.CHAPTERS(storyId))` (chapter.actions.ts:98) hit the wrong tag when the modal target differed from the row's story.

After:
```ts
const handleDeleteChapter = async (id: string, chNum: number, storyId: string) => {
  ...
  const res = await deleteChapter(id, storyId);
```
Caller passes the row's `story_id`:
```ts
onClick={() => handleDeleteChapter(ch.id, ch.chapter_number, ch.story_id)}
```
Verified: `deleteChapter(id: string, storyId: string)` action signature (chapter.actions.ts:89) takes the story id and revalidates `CACHE_TAGS.CHAPTERS(storyId)`; row shape `ChapterItem` includes `story_id` (use-admin-chapters.ts:10). Only one call site of `handleDeleteChapter` exists, so no other caller needed updating.

## Verification

- `npm run build` (frontend): PASS — compiled in 5.3s, TypeScript clean, 41/41 static pages generated, all routes listed.
- `npm run test:run` (frontend): PASS — 45 test files, 385 tests passed, 0 failed (30.09s).
- Commit: `a2046fff142fa1639d65002482fd512e1719a9f3` — `fix(admin): strict boolean parse for site settings and delete chapter with row story_id` (3 files, +5/−5). Pre-commit lint hook passed (`echo Lint ok`).

## Concerns

None. Minimal 2-line logic diffs; `targetComicId` remains for create/edit as intended.
