import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../storage/adapters';
import { ReaderProgressManager } from '../storage/reader/progress-tracker';
import { BookmarkManager } from '../storage/reader/bookmark-manager';

describe('Reader State & Offline Subsystem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ReaderProgressManager', () => {
    it('saves progress optimistically and checks read chapters', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage });

      const record = await manager.saveProgress({
        comicId: 'comic-1',
        chapterId: 'ch-5',
        chapterNumber: 5,
        scrollPosition: 1200,
        progressPercent: 75,
      });

      expect(record.comicId).toBe('comic-1');
      expect(record.chapterNumber).toBe(5);
      expect(record.synced).toBe(false);

      const fetched = await manager.getProgress('comic-1');
      expect(fetched?.chapterId).toBe('ch-5');
      expect(fetched?.scrollPosition).toBe(1200);

      // Chapter read checks
      expect(await manager.isChapterRead('comic-1', 1)).toBe(true);
      expect(await manager.isChapterRead('comic-1', 5)).toBe(true);
      expect(await manager.isChapterRead('comic-1', 6)).toBe(false);
    });

    it('lists all progress ordered by updatedAt descending', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage });

      await manager.saveProgress({ comicId: 'c1', chapterId: 'ch1', chapterNumber: 1 });
      await new Promise((r) => setTimeout(r, 10));
      await manager.saveProgress({ comicId: 'c2', chapterId: 'ch2', chapterNumber: 2 });

      const all = await manager.getAllProgress();
      expect(all).toHaveLength(2);
      expect(all[0].comicId).toBe('c2');
      expect(all[1].comicId).toBe('c1');
    });

    it('syncs with gateway using Last-Write-Wins (LWW) conflict resolution', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage });

      // Local progress 1: very recent (newer than remote)
      await manager.saveProgress({
        comicId: 'c1',
        chapterId: 'ch-local-new',
        chapterNumber: 10,
      });

      // Local progress 2: old date (older than remote)
      const oldTime = new Date('2026-01-01T00:00:00Z').toISOString();
      await storage.setItem('reader:progress:c2', {
        comicId: 'c2',
        chapterId: 'ch-local-old',
        chapterNumber: 2,
        updatedAt: oldTime,
        synced: false,
      });
      await storage.setItem('reader:progress_index', ['c1', 'c2']);

      const mockUserClient = {
        getHistory: vi.fn().mockResolvedValue([
          // Remote c1 is older than local
          { comic_id: 'c1', chapter_id: 'ch-remote-old', chapter_number: 8, updated_at: '2026-02-01T00:00:00Z' },
          // Remote c2 is newer than local
          { comic_id: 'c2', chapter_id: 'ch-remote-new', chapter_number: 20, updated_at: '2026-03-01T00:00:00Z' },
          // Remote c3 does not exist locally
          { comic_id: 'c3', chapter_id: 'ch-remote-only', chapter_number: 1, updated_at: '2026-04-01T00:00:00Z' },
        ]),
        saveHistory: vi.fn().mockResolvedValue({ success: true }),
      };

      const result = await manager.syncWithGateway(mockUserClient);

      // Local c1 pushed to remote
      expect(result.syncedCount).toBe(1);
      expect(mockUserClient.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({ comicId: 'c1', chapterId: 'ch-local-new', chapterNumber: 10 }),
      );

      // Remote c2 and c3 resolved into local
      expect(result.resolvedCount).toBe(2);

      const resolvedC2 = await manager.getProgress('c2');
      expect(resolvedC2?.chapterId).toBe('ch-remote-new');
      expect(resolvedC2?.chapterNumber).toBe(20);

      const resolvedC3 = await manager.getProgress('c3');
      expect(resolvedC3?.chapterId).toBe('ch-remote-only');
    });

    it('gracefully handles offline sync errors without clearing local state', async () => {
      const storage = new MemoryStorageAdapter();
      const onError = vi.fn();
      const manager = new ReaderProgressManager({ storage, onSyncError: onError });

      await manager.saveProgress({ comicId: 'c1', chapterId: 'ch1', chapterNumber: 1 });

      const failingUserClient = {
        getHistory: vi.fn().mockRejectedValue(new Error('Network offline')),
        saveHistory: vi.fn(),
      };

      await expect(manager.syncWithGateway(failingUserClient)).rejects.toThrow('Network offline');
      expect(onError).toHaveBeenCalled();

      // Local progress is preserved
      expect(await manager.getProgress('c1')).not.toBeNull();
    });
  });

  describe('BookmarkManager', () => {
    it('optimistically adds, removes, and toggles bookmarks', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      expect(await manager.isBookmarked('comic-1')).toBe(false);

      const added = await manager.addBookmark('comic-1', { chapterId: 'ch-1', chapterNumber: 1 });
      expect(added.comicId).toBe('comic-1');
      expect(await manager.isBookmarked('comic-1')).toBe(true);

      const toggledOff = await manager.toggleBookmark('comic-1');
      expect(toggledOff.bookmarked).toBe(false);
      expect(await manager.isBookmarked('comic-1')).toBe(false);

      const toggledOn = await manager.toggleBookmark('comic-1');
      expect(toggledOn.bookmarked).toBe(true);
      expect(await manager.isBookmarked('comic-1')).toBe(true);
    });

    it('synchronizes offline bookmark additions and removals with gateway', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // Offline actions: add c1, add c2, remove c2, add c3
      await manager.addBookmark('c1');
      await manager.addBookmark('c2');
      await manager.removeBookmark('c2');
      await manager.addBookmark('c3');

      const mockUserClient = {
        getBookmarks: vi.fn().mockResolvedValue([
          // Remote already had c4
          { comic_id: 'c4', created_at: '2026-01-01T00:00:00Z' },
        ]),
        addBookmark: vi.fn().mockResolvedValue({ bookmarked: true }),
        removeBookmark: vi.fn().mockResolvedValue({ bookmarked: false }),
      };

      const res = await manager.syncWithGateway(mockUserClient);

      expect(res.addedCount).toBe(2); // c1, c3
      expect(res.removedCount).toBe(1); // c2
      expect(mockUserClient.addBookmark).toHaveBeenCalledWith('c1');
      expect(mockUserClient.addBookmark).toHaveBeenCalledWith('c3');
      expect(mockUserClient.removeBookmark).toHaveBeenCalledWith('c2');

      // Remote c4 is now merged into local bookmarks
      expect(await manager.isBookmarked('c4')).toBe(true);
      expect(await manager.isBookmarked('c1')).toBe(true);
      expect(await manager.isBookmarked('c2')).toBe(false);

      const all = await manager.listBookmarks();
      expect(all.map((b) => b.comicId).sort()).toEqual(['c1', 'c3', 'c4']);
    });
  });
});
