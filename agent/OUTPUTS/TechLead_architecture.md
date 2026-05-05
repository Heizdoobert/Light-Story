# Tech Lead – Architecture

## Database Design

- **comics** table (uuid PK `id`, `owner_id` uuid FK to `profiles.id`, `title` varchar, `description` text, `cover_url` varchar, timestamps).
- **chapters** table (uuid PK `id`, `comic_id` uuid FK, `chapter_number` int, `title` varchar, `content` jsonb (array of image URLs), timestamps).
- **chapter_images** optional table (id, `chapter_id`, `image_url`) if we prefer a normalized design.
- Row‑Level Security policies: owners can INSERT/UPDATE/DELETE their own rows; SELECT allowed for all authenticated users.

## Edge Functions

1. `upload_to_r2.ts` – unchanged, but add token verification via `_shared/jwt.ts`.
2. `create_comic.ts`
   - Accepts `{title, description, cover_url}`.
   - Inserts into `comics` with `owner_id = auth.uid()`.
3. `add_chapter.ts`
   - Accepts `{comic_id, chapter_number, title, image_urls[]}`.
   - Inserts into `chapters` (store `image_urls` as JSONB) or creates rows in `chapter_images`.
   - Validates that `auth.uid()` matches the comic's `owner_id`.

## Frontend Structure (TypeScript)

- **Repositories** (`SupabaseComicRepository.ts`, `SupabaseChapterRepository.ts`) – thin wrappers around Supabase client for CRUD.
- **Services** (`ComicService.ts`, `ChapterService.ts`) – orchestrate R2 upload then call repository.
- **UI Components**
  - `CreateComicForm.tsx` – file input → call `R2Service.upload(file)` → on success call `ComicService.create(...)`.
  - `AddChapterForm.tsx` – multi‑file input, map each file through `R2Service.upload`, collect URLs, then `ChapterService.add(...)`.
- **Hooks** (`useCreateComic.ts`, `useAddChapter.ts`) – expose async functions for components.

## Folder Layout (new files)

```text
frontend/src/infrastructure/repositories/
  SupabaseComicRepository.ts
  SupabaseChapterRepository.ts
frontend/src/services/
  R2Service.ts
  ComicService.ts
  ChapterService.ts
frontend/src/app/admin/_components/
  CreateComicForm.tsx
  AddChapterForm.tsx
frontend/src/hooks/
  useCreateComic.ts
  useAddChapter.ts
```

## CI / Testing

- Add unit tests for repositories and services under `frontend/src/__tests__/`.
- Extend Supabase smoke tests (`backend-supabase/supabase/tests/`) with RPC calls for `create_comic` and `add_chapter`.
