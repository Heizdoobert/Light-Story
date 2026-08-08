# Task 9c Report — Fix Batch 3c: admin role source + comic CRUD pages

- Date: 2026-08-09
- Scope: M12, M13, M14, M15, F16, F17
- Workdir: `D:\Light-Story\frontend`

## Summary

All acceptance criteria met. `npm run build` and `npm run test:run` both green.
Commit: see bottom of report (task-9c).

## Description decision (brief required evidence)

**Decision: ADD description to create/update flow — the story model supports it.**

Evidence:
- `src/types/entities.ts:6` — `Story.description: string` (stories table row type).
- `src/lib/schemas/admin-stories.ts:20` — `updateStorySchema` includes `description: z.string()`, sent to the gateway in `src/actions/admin-stories.actions.ts:88`.
- `src/services/comics/comicCms.service.ts` — `ComicDbRow.description` (:65); `createComicFromMetadata` POSTs description (:292); `updateComicRecord` PATCHes description (:310).
- `src/services/comics/comic.service.ts:11,23` — `ComicContext.description`; `createComic` POSTs `description` (:195).
- `src/lib/schemas/comic-cms-schemas.ts:38` — `description` in `ComicCmsFormSchema`.
- The edit page already read `data.description` from `stories` (dead on write — the bug).

The backend/gateway + DB model accept description on both create and update, so the
correct fix is wiring it through, not deleting the field.

## Per-finding before/after

### M12 — `(admin)/layout.tsx` / `use-user.ts`: role source mismatch

**Before:** `use-user.ts:29-38` resolved role only from `profiles.role`;
`app_metadata.role` (the source synced by the DB trigger and used by
`permission.ts:37-40` + `middleware.ts:86-88`) was never consulted → admin gate
could disagree with the server-side guard. `isStaff` also omitted `internal`,
which middleware's `ADMIN_ROLES` allows.

**After:** `src/hooks/features/use-user.ts` mirrors the middleware pattern:
`app_metadata.role` preferred → `user_metadata.role` fallback → `profiles.role`
last (normalized trim/lowercase). `isStaff` now uses
`ADMIN_ROLES = ["superadmin","admin","employee","internal"]`, matching
`middleware.ts:5`. `(admin)/layout.tsx` unchanged (its role source is `useUser().isStaff`).

### M13 — `admin/comics/new/page.tsx`: dead `description` state

**Before:** `description` state existed but was never passed to `createComic`
(`:20` submitted `{ title, author, status }` only).

**After:** `description` is included in the `createComic` payload. Schema
(`lib/schemas/comic.ts`) gained `description: z.string().optional().default('')`;
action (`comic.actions.ts`) inserts `description` into `stories`.

### F16 — same file: hardcoded `status: 'ongoing'`

**Before:** `status: 'ongoing'` hardcoded in the submit call.

**After:** Added a status `<select>` (plain `<select>`, matching the textarea
styling in the file; no UI Select component exists). Backed by a new exported
`COMIC_STATUSES` constant in `lib/schemas/comic.ts`. The schema's status enum
was also unified from `['ongoing','completed','dropped','draft','published']`
to the canonical `['draft','published','ongoing','completed','archived']`
(`dropped` exists nowhere else — `Story`/`comic-cms-schemas`/`admin-stories`/
`story-form` all use the archived set; `dropped` would write an invalid value).
Default in the form stays `'ongoing'` (preserves prior behavior).

### F17 — same file: silent `createComic` failure

**Before:** `if (res.success) router.push(...)` — failures silently did nothing.

**After:** `sonner` toast (pattern from `admin/chapters/[chapterId]/page.tsx:73-78`):
`toast.success` on success, `toast.error(res.error)` on failure, `try/catch`
with `finally` resetting `isSubmitting`.

### M14 — `admin/comics/[comicId]/page.tsx`: inline supabase read, no loading/error

**Before:** inline `useEffect` → `supabase.from('stories').select('*')` with no
loading or error state; a failed fetch silently rendered an empty form.

**After:** read moved to the existing `fetchStoryById` service
(`src/services/comics/story.service.ts:48` — apiClient with Supabase fallback,
the same service used by `useComicDetailPresenter`/`useStoryDetail`; no new
service needed). Added `isLoading` state (pulse "Đang tải…" placeholder),
`error` state + retry button (renders "Không tìm thấy truyện" on null or the
error message), so a failed fetch never shows a silent empty form.

### M15 — same file: `description` edits discarded

**Before:** form edited `description` but submit called
`updateComic(comicId, { title, author })` — edits silently lost.

**After:** `updateComic(comicId, { title, author, description })`. Flow-through
is automatic: `updateComicSchema = createComicSchema.partial()` now includes
`description`, and the action spreads `parsed.data` into the update. Submit also
gains the same toast error/success feedback as the new page (prevents silent
submit failures).

## Test outputs

```
> next build
✓ Compiled successfully in 6.5s
✓ Finished TypeScript in 8.8s
✓ Generating static pages (41/41)
All routes compiled (incl. /admin/comics/new, /admin/comics/[comicId])
```

```
> vitest run
Test Files  45 passed (45)
     Tests  385 passed (385)
  Duration  28.47s
```

## Commit

`f3a877c` — `fix(admin): align admin role source with app_metadata, fix comic create/edit pages (task 9c)` (pre-commit lint hook passed).
