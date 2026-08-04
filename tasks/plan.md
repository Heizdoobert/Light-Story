# Implementation Plan: Comprehensive Directory Restructuring

## Architecture & Goal
Refactor the Next.js frontend codebase in `frontend/src/` to match the exact directory tree specified by the user.

## Phases & Strategy

### Phase 1: Core Foundation & Lib Infrastructure (`src/lib/` & `src/providers/`)
1. Create `src/lib/constants/` (`routes.ts`, `cache-tags.ts`, `comic-status.ts`, `pagination.ts`).
2. Create `src/lib/utils/` (`cn.ts`, `format-date.ts`, `api-client.ts`, `image-url.ts`).
3. Create `src/lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`).
4. Create `src/lib/r2/` (`client.ts`, `upload.ts`).
5. Create `src/lib/schemas/` (`comic.ts`, `chapter.ts`, `audit.ts`).
6. Create `src/lib/actions/` (`comic.actions.ts`, `chapter.actions.ts`, `audit.actions.ts`, `user.actions.ts`).
7. Create `src/lib/hooks/` (`use-user.ts`, `use-chapter-images.ts`, `use-debounce.ts`).
8. Create `src/providers/` (`theme-provider.tsx`, `supabase-provider.tsx`, `query-provider.tsx`).

### Phase 2: Components Restructuring (`src/components/`)
1. Create `src/components/ui/` (`button.tsx`, `input.tsx`, `card.tsx`, `skeleton.tsx`, `badge.tsx`, `modal.tsx`, `dropdown-menu.tsx`, `index.ts`).
2. Create `src/components/layout/` (`public-header.tsx`, `public-footer.tsx`, `user-sidebar.tsx`, `admin-sidebar.tsx`, `mobile-nav.tsx`).
3. Create `src/components/comic/` (`comic-card.tsx`, `comic-list.tsx`, `chapter-list.tsx`, `chapter-reader.tsx`, `rating-stars.tsx`, `genre-badge.tsx`).
4. Create `src/components/admin/` (`data-table.tsx`, `form-editor.tsx`, `image-uploader.tsx`, `stat-card.tsx`).
5. Create `src/components/user/` (`bookmark-button.tsx`, `reading-progress.tsx`).

### Phase 3: Route Groups & App Restructuring (`src/app/`)
1. Refactor `(public)` group:
   - `src/app/(public)/page.tsx`
   - `src/app/(public)/comics/page.tsx`
   - `src/app/(public)/comics/[comicId]/page.tsx`
   - `src/app/(public)/comics/[comicId]/chapter/[chapterId]/page.tsx`
   - `src/app/(public)/genres/[genreSlug]/page.tsx`
   - `src/app/(public)/layout.tsx`
2. Refactor `(user)` group:
   - `src/app/(user)/dashboard/page.tsx`
   - `src/app/(user)/history/page.tsx`
   - `src/app/(user)/bookmarks/page.tsx`
   - `src/app/(user)/profile/page.tsx`
   - `src/app/(user)/layout.tsx`
3. Refactor `(admin)` group:
   - `src/app/(admin)/admin/dashboard/page.tsx`
   - `src/app/(admin)/admin/comics/page.tsx`
   - `src/app/(admin)/admin/comics/new/page.tsx`
   - `src/app/(admin)/admin/comics/[comicId]/page.tsx`
   - `src/app/(admin)/admin/chapters/page.tsx`
   - `src/app/(admin)/admin/chapters/[chapterId]/page.tsx`
   - `src/app/(admin)/admin/users/page.tsx`
   - `src/app/(admin)/admin/audit/page.tsx`
   - `src/app/(admin)/layout.tsx`
4. Setup `src/app/api/webhooks/supabase/route.ts`, `src/app/layout.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`.

### Phase 4: Clean Up & Verification
1. Remove legacy directories: `src/views`, `src/@core`, `src/@layouts`, `src/@menu`, `src/configs`.
2. Run `npm run lint`.
3. Run `npm run test:run`.
4. Run `npm run build`.
