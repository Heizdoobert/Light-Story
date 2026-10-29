# Project: Light-Story SDK Expansion (@light-story/sdk)

## Architecture
`@light-story/sdk` provides zero-runtime-dependency TypeScript clients and utilities for the Light-Story monorepo.
- **HTTP Transport**: `HttpClient` in `packages/sdk/src/client.ts` handling retries, bearer token resolution, timeouts, and JSON unwrap.
- **Gateway Domain Clients**: `packages/sdk/src/gateway/` registering domain clients (`search`, `chapters`, `comments`, alongside existing `stories`, `comics`, `user`, `admin`, `analytics`, `r2`, `health`).
- **Resilient Storage Subsystem**: `packages/sdk/src/storage/` providing SSR-safe storage adapters (`MemoryStorageAdapter`, `WebStorageAdapter`) and high-level reader state utilities (`ReaderProgressManager`, `BookmarkManager`).
- **Zero Runtime Dependencies**: Strict adherence to Web Standard APIs (`fetch`, `crypto`, `localStorage` abstractions); `dependencies` in `packages/sdk/package.json` remains `{}`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Search Client (Stories) | Query text stories with keywords, categories, tags, status, sorting, pagination | M1 | ORIGINAL_REQUEST §R2 |
| 2 | Search Client (Comics) | Query comics with keywords, sorting, pagination, and recommendations | M1 | ORIGINAL_REQUEST §R2 |
| 3 | Unified Search & Suggestions | Search across stories and comics, plus search suggestions | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Chapters Client (Listing & Details) | Fetch chapters by story, chapter detail by ID, batch latest chapters | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Chapters Navigation Resolution | Pure algorithmic navigation (previous, current, next, boundary checks) | M1 | ORIGINAL_REQUEST §R2 |
| 6 | Chapters Content Parsing | Parse JSON image lists, comma-separated URLs, and detect CBZ archives | M1 | ORIGINAL_REQUEST §R2 |
| 7 | Comments Client (Story Comments) | List comments, add comments, delete comments, threaded reply support | M1 | ORIGINAL_REQUEST §R2 |
| 8 | Ratings & Reviews Client | List ratings, submit ratings (1-5 stars) and reviews, calculate summary statistics | M1 | ORIGINAL_REQUEST §R2 |
| 9 | Storage Adapter Interface & Factory | Uniform storage contract (`getItem`, `setItem`, `removeItem`, `clear`, `keys`, `has`, sync helpers) | M1 | ORIGINAL_REQUEST §R3 |
| 10 | Memory Storage Adapter | In-memory key-value map with TTL expiration and max capacity eviction for SSR/Node | M1 | ORIGINAL_REQUEST §R3 |
| 11 | Web Storage Adapter | LocalStorage/SessionStorage adapter with canary test, quota eviction, and memory fallback | M1 | ORIGINAL_REQUEST §R3 |
| 12 | Reader Progress Manager | Track last read chapter, scroll position, percent, debounced save, offline queue | M1 | ORIGINAL_REQUEST §R3 |
| 13 | Reader Progress Sync | Last-Write-Wins (LWW) conflict resolution syncing local progress with `/api/user/history` | M1 | ORIGINAL_REQUEST §R3 |
| 14 | Bookmark Manager | Optimistic local bookmarking, listing, toggling, and offline mutation queue | M1 | ORIGINAL_REQUEST §R3 |
| 15 | Bookmark Remote Reconciliation | Sync local bookmarks with `/api/user/bookmarks` on authentication | M1 | ORIGINAL_REQUEST §R3 |
| 16 | Public Exports & Gateway Integration | Mount `search`, `chapters`, `comments` on `GatewayApi` and export storage utilities | M1 | ORIGINAL_REQUEST §R1-R3 |
| 17 | Zero-Dependency & Packaging Enforcement | Guarantee `package.json` has 0 dependencies, clean `tsc` build in `dist/` | M1 | ORIGINAL_REQUEST §R1 |
| 18 | Comprehensive Unit Test Suite | Vitest suites covering all new clients, storage adapters, and edge cases | M2 | ORIGINAL_REQUEST §R4 |
| 19 | Monorepo Regression Verification | Ensure frontend and monorepo test suites pass cleanly | M2 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: SDK Modules & Resilient Storage Implementation | Implement `SearchClient`, `ChaptersClient`, `CommentsClient` in `gateway/`, storage adapters and reader sync managers in `storage/`, wire up `GatewayApi`, exports, and build verification | none | IN_PROGRESS |
| 2 | M2: Final Milestone (Comprehensive Testing & Adversarial Hardening) | Phase 1: 100% test pass on unit/integration suites; Phase 2: Adversarial coverage hardening (Tier 5 challenger loop) | M1 | PLANNED |

## Interface Contracts
### `SearchClient` (`packages/sdk/src/gateway/search.ts`)
- `searchStories(params?: SearchFilterParams, options?: RequestOptions): Promise<SearchPageResult<StoryItem>>`
- `searchComics(params?: SearchFilterParams, options?: RequestOptions): Promise<SearchPageResult<ComicItem>>`
- `searchAll(keyword: string, params?: Omit<SearchFilterParams, 'keyword'>, options?: RequestOptions): Promise<{ stories: SearchPageResult<StoryItem>; comics: SearchPageResult<ComicItem> }>`
- `suggest(keyword: string, limit?: number, options?: RequestOptions): Promise<{ suggestions: string[] }>`

### `ChaptersClient` (`packages/sdk/src/gateway/chapters.ts`)
- `listByStory(storyId: string, options?: RequestOptions): Promise<ChapterItem[]>`
- `getById(chapterId: string, options?: RequestOptions): Promise<ChapterItem>`
- `getBatchLatest(comicIds: string[], options?: RequestOptions): Promise<ChapterItem[]>`
- `create(comicId: string, data: { chapterNumber: number; title: string; content: string }, options?: RequestOptions): Promise<ChapterItem>`
- `update(chapterId: string, updates: Partial<ChapterItem>, options?: RequestOptions): Promise<ChapterItem>`
- `delete(chapterId: string, options?: RequestOptions): Promise<{ success: boolean }>`
- `resolveNavigation(chapters: ChapterItem[], currentChapterId: string): ChapterNavigationResolution`
- `parseChapterPages(content: unknown): ParsedChapterPages`

### `CommentsClient` (`packages/sdk/src/gateway/comments.ts`)
- `listComments(params: CommentListParams, options?: RequestOptions): Promise<{ items: CommentItem[]; total: number }>`
- `createComment(input: { storyId: string; body: string; parentId?: string | null }, options?: RequestOptions): Promise<CommentItem>`
- `deleteComment(commentId: string, options?: RequestOptions): Promise<{ success: boolean }>`
- `toggleLike(commentId: string, options?: RequestOptions): Promise<{ liked: boolean; likeCount: number }>`
- `listRatings(storyId: string, params?: { page?: number; pageSize?: number }, options?: RequestOptions): Promise<{ items: RatingItem[]; total: number }>`
- `submitRating(input: { storyId: string; rating: number; review?: string }, options?: RequestOptions): Promise<RatingItem>`
- `calculateRatingSummary(storyId: string, ratings: RatingItem[]): RatingSummary`

### `StorageAdapter` (`packages/sdk/src/storage/adapters/`)
- `getItem<T>(key: string): Promise<T | null>`
- `setItem<T>(key: string, value: T, ttlMs?: number): Promise<void>`
- `removeItem(key: string): Promise<void>`
- `clear(): Promise<void>`
- `keys(prefix?: string): Promise<string[]>`
- `has(key: string): Promise<boolean>`
- `getItemSync?<T>(key: string): T | null`
- `setItemSync?<T>(key: string, value: T, ttlMs?: number): void`

### `ReaderProgressManager` (`packages/sdk/src/storage/reader/`)
- `saveProgress(data: { comicId: string; chapterId: string; chapterNumber: number; scrollPosition?: number; progressPercent?: number }): Promise<ReadingProgressRecord>`
- `getProgress(comicId: string): Promise<ReadingProgressRecord | null>`
- `getAllProgress(): Promise<ReadingProgressRecord[]>`
- `isChapterRead(comicId: string, chapterNumber: number): Promise<boolean>`
- `syncWithGateway(userClient: { getHistory: Function; saveHistory: Function }): Promise<{ syncedCount: number; resolvedCount: number }>`
- `flush(): Promise<void>`

### `BookmarkManager` (`packages/sdk/src/storage/reader/`)
- `addBookmark(comicId: string, meta?: { chapterId?: string; chapterNumber?: number }): Promise<BookmarkRecord>`
- `removeBookmark(comicId: string): Promise<boolean>`
- `toggleBookmark(comicId: string, meta?: { chapterId?: string; chapterNumber?: number }): Promise<{ bookmarked: boolean }>`
- `isBookmarked(comicId: string): Promise<boolean>`
- `listBookmarks(): Promise<BookmarkRecord[]>`
- `syncWithGateway(userClient: { getBookmarks: Function; addBookmark: Function; removeBookmark: Function }): Promise<{ addedCount: number; removedCount: number }>`

## Code Layout
```
packages/sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── client.ts
│   ├── errors.ts
│   ├── interceptors.ts
│   ├── retry.ts
│   ├── types.ts
│   ├── index.ts
│   ├── gateway/
│   │   ├── index.ts
│   │   ├── search.ts
│   │   ├── chapters.ts
│   │   ├── comments.ts
│   │   ├── stories.ts
│   │   ├── comics.ts
│   │   ├── user.ts
│   │   ├── admin.ts
│   │   ├── analytics.ts
│   │   ├── r2.ts
│   │   └── health.ts
│   ├── storage/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── storage-manager.ts (Preserved)
│   │   ├── adapters/
│   │   │   ├── adapter.interface.ts
│   │   │   ├── memory-adapter.ts
│   │   │   ├── web-storage-adapter.ts
│   │   │   └── factory.ts
│   │   └── reader/
│   │       ├── types.ts
│   │       ├── progress-tracker.ts
│   │       ├── bookmark-manager.ts
│   │       └── sync-manager.ts
│   └── __tests__/
│       ├── search.test.ts
│       ├── chapters.test.ts
│       ├── comments.test.ts
│       ├── storage-adapters.test.ts
│       ├── reader-state.test.ts
│       └── ... (existing 5 test files)
```
