# Reader State & Offline Subsystem

The reader state subsystem provides optimistic, resilient client-side storage for reading progress, reading history, and comic bookmarks.

## ReaderProgressManager

Manages reading history, current chapter progress, and scroll state. Progress writes are debounced and cached in-memory and synced to persistent storage.

```typescript
import { ReaderProgressManager } from '@light-story/sdk';

const progressManager = new ReaderProgressManager({
  debounceMs: 1000,
  maxHistoryItems: 100,
  onSyncSuccess: (records) => console.log('Synced progress', records),
  onSyncError: (err) => console.warn('Progress sync error', err),
});

// Save progress (optimistic & debounced)
await progressManager.saveProgress({
  comicId: 'comic-123',
  chapterId: 'chapter-5',
  chapterNumber: 5,
  progressPercent: 80,
  scrollPosition: 1450,
});

// Check if chapter is already read
const hasRead = await progressManager.isChapterRead('comic-123', 5);

// Fetch recent reading history
const history = await progressManager.getAllProgress();
```

## BookmarkManager

Manages local bookmark records with queued mutations for background server sync.

```typescript
import { BookmarkManager } from '@light-story/sdk';

const bookmarkManager = new BookmarkManager({
  onSyncSuccess: () => console.log('Bookmarks synchronized'),
  onSyncError: (err) => console.warn('Bookmark sync error', err),
});

// Toggle bookmark
const { bookmarked } = await bookmarkManager.toggleBookmark('comic-123', {
  chapterId: 'chapter-5',
  chapterNumber: 5,
});

// Check bookmark state
const isBookmarked = await bookmarkManager.isBookmarked('comic-123');

// Retrieve all local bookmarks
const bookmarks = await bookmarkManager.getBookmarks();
```

## SSR & Environment Safety

Both `ReaderProgressManager` and `BookmarkManager` default to `createStorageAdapter()`. In SSR or Node.js runtime environments where `window` is not defined, they automatically use `MemoryStorageAdapter` without throwing errors or requiring mocks.
