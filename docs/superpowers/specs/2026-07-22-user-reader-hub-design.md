# User Reader Hub (Bookmarks & Reading History) Design Spec

## Overview
Personalized reading hub supporting bookmarking comics and tracking reading history progress, operating seamlessly for both guest readers (`localStorage`) and authenticated users (Supabase PostgreSQL sync).

## Architecture & Data Flow

### 1. Database Schema
Supabase tables (RLS enabled for `user_id = auth.uid()`):

#### `bookmarks`
- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users`)
- `comic_id` (text, not null)
- `created_at` (timestamp)

#### `reading_history`
- `id` (uuid, primary key)
- `user_id` (uuid, references `auth.users`)
- `comic_id` (text, not null)
- `chapter_id` (text, not null)
- `chapter_number` (number)
- `progress_pct` (number, default 0)
- `updated_at` (timestamp)

### 2. Dual Storage Strategy
```
               ┌───────────────────────┐
               │    User Interaction   │
               └───────────┬───────────┘
                           │
                 Is User Logged In?
                 /               \
              [YES]             [NO]
               /                 \
  ┌──────────────────────┐  ┌──────────────────────┐
  │ Supabase REST API    │  │ Browser LocalStorage │
  │ bookmarks & history  │  │ 'reader:bookmarks'   │
  │ tables via apiClient │  │ 'reader:history'     │
  └──────────────────────┘  └──────────────────────┘
```

When a user logs in, any existing `localStorage` bookmarks and history items are automatically merged into Supabase.

## Component & Service Interface

### Service Functions (`frontend/src/services/readerHub.service.ts`)
- `getBookmarks()`: Promise<BookmarkItem[]>
- `toggleBookmark(comicId: string)`: Promise<boolean>
- `getReadingHistory()`: Promise<HistoryItem[]>
- `recordReadingHistory(comicId: string, chapterId: string, chapterNumber: number)`: Promise<void>
- `syncGuestDataToAccount()`: Promise<void>

### Presenter Hooks
- `useBookmarks()`: Query + mutation for bookmark list & toggle state.
- `useReadingHistory()`: Query + mutation for reading history list & record action.

### UI Components
- `<BookmarkButton comicId={comicId} />`: Toggle bookmark button on comic detail page (`/comics/[comicId]`).
- `<ReadingHistoryDrawer />`: Drawer / modal displaying reading history & quick-continue links.
- Top Nav Link in `<Header />`: Access to Bookmarks & Reading History.

## Error Handling & Edge Cases
- Network failures fall back gracefully to `localStorage` cache.
- RLS errors logged silently without crashing the chapter reader.

## Testing Strategy
- Unit test for `readerHub.service.ts` (localStorage fallback + Supabase sync logic).
- Unit test for `useBookmarks` and `useReadingHistory` presenter hooks.
