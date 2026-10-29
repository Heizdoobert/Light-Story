import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MemoryStorageAdapter,
  WebStorageAdapter,
} from '../storage/adapters';
import { ReaderProgressManager } from '../storage/reader/progress-tracker';
import { BookmarkManager } from '../storage/reader/bookmark-manager';

describe('Empirical Adversarial Stress Tests: Storage & Reader State', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Stress MemoryStorageAdapter under rapid sequential writes (>1,500 items)
  // =========================================================================
  describe('1. MemoryStorageAdapter - Rapid Writes & LRU Eviction Bounds', () => {
    it('bounds capacity to exactly maxItems under 2,000 rapid sequential writes', async () => {
      const MAX_ITEMS = 1000;
      const adapter = new MemoryStorageAdapter({ maxItems: MAX_ITEMS });

      // Rapidly write 2,000 unique items
      for (let i = 0; i < 2000; i++) {
        adapter.setItemSync(`item_${i}`, { index: i, payload: `data_${i}` });
      }

      // 1. Verify memory bound: total key count cannot exceed MAX_ITEMS
      const allKeys = await adapter.keys();
      expect(allKeys.length).toBe(MAX_ITEMS);

      // 2. Oldest 1,000 items (0..999) must be evicted in strict LRU order
      for (let i = 0; i < 1000; i++) {
        expect(adapter.getItemSync(`item_${i}`)).toBeNull();
      }

      // 3. Newest 1,000 items (1000..1999) must remain intact
      for (let i = 1000; i < 2000; i++) {
        const item = adapter.getItemSync<{ index: number }>(`item_${i}`);
        expect(item).not.toBeNull();
        expect(item?.index).toBe(i);
      }
    });

    it('preserves frequently accessed items from eviction under heavy write churn', async () => {
      const adapter = new MemoryStorageAdapter({ maxItems: 100 });

      // Insert initial 100 items (0..99)
      for (let i = 0; i < 100; i++) {
        adapter.setItemSync(`key_${i}`, `val_${i}`);
      }

      // Access key_5 and key_10 to update their access sequence
      expect(adapter.getItemSync('key_5')).toBe('val_5');
      expect(adapter.getItemSync('key_10')).toBe('val_10');

      // Now write 90 new items (100..189)
      for (let i = 100; i < 190; i++) {
        adapter.setItemSync(`key_${i}`, `val_${i}`);
      }

      // Key 0..4 should be evicted
      expect(adapter.getItemSync('key_0')).toBeNull();
      expect(adapter.getItemSync('key_1')).toBeNull();

      // Key 5 and 10 were touched, so they should survive while older untouched keys were evicted!
      expect(adapter.getItemSync('key_5')).toBe('val_5');
      expect(adapter.getItemSync('key_10')).toBe('val_10');

      // Total keys must still equal 100
      const keys = await adapter.keys();
      expect(keys.length).toBe(100);
    });

    it('purges expired items first before evicting unexpired items when capacity is reached', async () => {
      const adapter = new MemoryStorageAdapter({ maxItems: 5 });

      // Insert 3 items that expire in 20ms
      adapter.setItemSync('exp_1', 'short1', 20);
      adapter.setItemSync('exp_2', 'short2', 20);
      adapter.setItemSync('exp_3', 'short3', 20);

      // Insert 2 long-lived items
      adapter.setItemSync('perm_1', 'keep1', 10000);
      adapter.setItemSync('perm_2', 'keep2', 10000);

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 35));

      // Capacity is currently 5 stored records, but 3 are expired.
      // Inserting 3 new items should purge the expired ones without evicting perm_1 or perm_2
      adapter.setItemSync('new_1', 'val1');
      adapter.setItemSync('new_2', 'val2');
      adapter.setItemSync('new_3', 'val3');

      expect(adapter.getItemSync('perm_1')).toBe('keep1');
      expect(adapter.getItemSync('perm_2')).toBe('keep2');
      expect(adapter.getItemSync('new_1')).toBe('val1');
      expect(adapter.getItemSync('new_2')).toBe('val2');
      expect(adapter.getItemSync('new_3')).toBe('val3');
      expect(adapter.getItemSync('exp_1')).toBeNull();
    });

    it('handles custom maxItems bounds and prefix isolation under rapid writes', async () => {
      const adapter = new MemoryStorageAdapter({ maxItems: 250, prefix: 'm1_prefix:' });

      // Write 1,600 items
      for (let i = 0; i < 1600; i++) {
        adapter.setItemSync(`id_${i}`, i);
      }

      const keys = await adapter.keys();
      expect(keys.length).toBe(250);

      // Verify prefix filtering
      const filteredKeys = await adapter.keys('id_15');
      expect(filteredKeys.length).toBeGreaterThan(0);
      for (const k of filteredKeys) {
        expect(k.startsWith('id_15')).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. Simulate QuotaExceededError in WebStorageAdapter
  // =========================================================================
  describe('2. WebStorageAdapter - QuotaExceededError & Fallback Recovery', () => {
    function createMockStorage(): Storage {
      const store = new Map<string, string>();
      return {
        get length() {
          return store.size;
        },
        clear: vi.fn(() => store.clear()),
        getItem: vi.fn((k: string) => store.get(k) ?? null),
        key: vi.fn((idx: number) => Array.from(store.keys())[idx] ?? null),
        removeItem: vi.fn((k: string) => {
          store.delete(k);
        }),
        setItem: vi.fn((k: string, v: string) => {
          store.set(k, v);
        }),
      };
    }

    it('evicts 20% oldest entries upon QuotaExceededError and retries write successfully', async () => {
      const mockStorage = createMockStorage();

      // Seed 10 existing items with spaced updatedAt timestamps
      for (let i = 1; i <= 10; i++) {
        mockStorage.setItem(
          `ls:entry_${i}`,
          JSON.stringify({
            value: `data_${i}`,
            metadata: { createdAt: i * 1000, updatedAt: i * 1000 },
          }),
        );
      }

      let quotaTriggeredCount = 0;
      const realSetItem = mockStorage.setItem;

      mockStorage.setItem = vi.fn((key: string, value: string) => {
        // Trigger quota error on the first attempt of writing entry_11
        if (key === 'ls:entry_11' && quotaTriggeredCount === 0) {
          quotaTriggeredCount++;
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return realSetItem.call(mockStorage, key, value);
      });

      const adapter = new WebStorageAdapter(mockStorage, { prefix: 'ls:' });
      await adapter.setItem('entry_11', 'data_11');

      // 20% of 10 items is 2 items -> entry_1 and entry_2 must have been evicted
      expect(mockStorage.removeItem).toHaveBeenCalledWith('ls:entry_1');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('ls:entry_2');
      expect(mockStorage.removeItem).not.toHaveBeenCalledWith('ls:entry_3');

      // entry_11 is successfully saved
      const saved = await adapter.getItem('entry_11');
      expect(saved).toBe('data_11');
    });

    it('falls back seamlessly to MemoryStorageAdapter when quota eviction cannot free enough space', async () => {
      const mockStorage = createMockStorage();

      // Mock storage that ALWAYS throws QuotaExceededError on setItem
      mockStorage.setItem = vi.fn((key: string) => {
        if (key.startsWith('__ls_canary_')) {
          return; // Canary probe passes
        }
        const err = new Error('Disk full');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      });

      const adapter = new WebStorageAdapter(mockStorage, { prefix: 'ls:' });

      // setItem must not throw; it must seamlessly write to memory fallback
      await expect(adapter.setItem('heavy_key', { large: 'object' })).resolves.not.toThrow();

      // Data must be retrievable via getItem and has
      const retrieved = await adapter.getItem<{ large: string }>('heavy_key');
      expect(retrieved).toEqual({ large: 'object' });
      expect(await adapter.has('heavy_key')).toBe(true);

      // Data must be discoverable in keys()
      const allKeys = await adapter.keys();
      expect(allKeys).toContain('heavy_key');

      // Removal must clear it from fallback
      await adapter.removeItem('heavy_key');
      expect(await adapter.getItem('heavy_key')).toBeNull();
      expect(await adapter.has('heavy_key')).toBe(false);
    });

    it('identifies NS_ERROR_DOM_QUOTA_REACHED and code 1014 / 22 error variants', async () => {
      const quotaErrors = [
        { name: 'NS_ERROR_DOM_QUOTA_REACHED' },
        { code: 22 },
        { code: 1014 },
        { number: -2147024882 },
      ];

      for (const errVariant of quotaErrors) {
        const mockStorage = createMockStorage();

        // Seed 1 item for eviction target BEFORE mocking setItem
        mockStorage.setItem(
          'ls:old_seed',
          JSON.stringify({ value: 'old', metadata: { updatedAt: 10 } }),
        );

        let quotaThrown = false;
        const realSet = mockStorage.setItem;

        mockStorage.setItem = vi.fn((key: string, val: string) => {
          if (!key.startsWith('__ls_canary_') && !quotaThrown) {
            quotaThrown = true;
            throw Object.assign(new Error('Quota limit reached'), errVariant);
          }
          return realSet.call(mockStorage, key, val);
        });

        const adapter = new WebStorageAdapter(mockStorage, { prefix: 'ls:' });
        await adapter.setItem('new_test', 'success');

        expect(quotaThrown).toBe(true);
        expect(await adapter.getItem('new_test')).toBe('success');
      }
    });

    it('survives private browsing SecurityError during initialization without throwing', async () => {
      const securityThrowingStorage = {
        setItem: vi.fn(() => {
          throw new DOMException('Permission denied', 'SecurityError');
        }),
      } as unknown as Storage;

      const adapter = new WebStorageAdapter(securityThrowingStorage);

      // All CRUD operations continue cleanly in memory fallback
      await adapter.setItem('private_key', 'private_value');
      expect(await adapter.getItem('private_key')).toBe('private_value');
      expect(await adapter.keys()).toContain('private_key');
      await adapter.clear();
      expect(await adapter.getItem('private_key')).toBeNull();
    });
  });

  // =========================================================================
  // 3. ReaderProgressManager - Concurrency, Debounce, and LWW Conflict Resolution
  // =========================================================================
  describe('3. ReaderProgressManager - Concurrency, Debounce & LWW Sync', () => {
    it('handles 50 concurrent saveProgress updates across distinct comics without index corruption', async () => {
      const storage = new MemoryStorageAdapter({ maxItems: 500 });
      const manager = new ReaderProgressManager({ storage, debounceMs: 50, maxHistoryItems: 100 });

      // Concurrently launch 50 saveProgress calls
      const writes = Array.from({ length: 50 }, (_, i) =>
        manager.saveProgress({
          comicId: `comic_${i}`,
          chapterId: `ch_${i * 2}`,
          chapterNumber: i * 2,
          scrollPosition: i * 100,
          progressPercent: 50,
        }),
      );

      await Promise.all(writes);

      // Verify all 50 comics are tracked
      const all = await manager.getAllProgress();
      expect(all.length).toBe(50);

      // Verify spot check
      const item25 = await manager.getProgress('comic_25');
      expect(item25?.chapterNumber).toBe(50);
      expect(await manager.isChapterRead('comic_25', 49)).toBe(true);
      expect(await manager.isChapterRead('comic_25', 51)).toBe(false);
    });

    it('preserves the latest progress under rapid-fire concurrent writes to the same comic', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage, debounceMs: 100 });

      // Sequential rapid writes to comic_alpha
      for (let ch = 1; ch <= 10; ch++) {
        await manager.saveProgress({
          comicId: 'comic_alpha',
          chapterId: `ch_${ch}`,
          chapterNumber: ch,
          scrollPosition: ch * 250,
          progressPercent: ch * 10,
        });
      }

      const finalRecord = await manager.getProgress('comic_alpha');
      expect(finalRecord?.chapterNumber).toBe(10);
      expect(finalRecord?.scrollPosition).toBe(2500);
      expect(finalRecord?.progressPercent).toBe(100);
      expect(await manager.isChapterRead('comic_alpha', 10)).toBe(true);
    });

    it('correctly resolves out-of-order and multi-directional LWW conflict timestamps', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage });

      // Local state setup:
      // Local Comic 1: Updated at 2026-06-01 (NEWER than remote)
      await storage.setItem('reader:progress:comic_1', {
        comicId: 'comic_1',
        chapterId: 'ch_local_new',
        chapterNumber: 15,
        updatedAt: '2026-06-01T00:00:00Z',
        synced: false,
      });

      // Local Comic 2: Updated at 2026-01-01 (OLDER than remote)
      await storage.setItem('reader:progress:comic_2', {
        comicId: 'comic_2',
        chapterId: 'ch_local_old',
        chapterNumber: 3,
        updatedAt: '2026-01-01T00:00:00Z',
        synced: false,
      });

      // Local Comic 3: Already synced with identical timestamp
      await storage.setItem('reader:progress:comic_3', {
        comicId: 'comic_3',
        chapterId: 'ch_identical',
        chapterNumber: 7,
        updatedAt: '2026-03-01T00:00:00Z',
        synced: true,
      });

      // Index of local items
      await storage.setItem('reader:progress_index', ['comic_1', 'comic_2', 'comic_3']);

      // Remote returns list with out-of-order records:
      // - comic_2 has a much newer update (2026-08-01)
      // - comic_1 has an older update (2026-02-01)
      // - comic_3 has matching timestamp
      // - comic_4 exists only on remote (2026-04-01)
      const mockUserClient = {
        getHistory: vi.fn().mockResolvedValue([
          {
            comic_id: 'comic_3',
            chapter_id: 'ch_identical',
            chapter_number: 7,
            updated_at: '2026-03-01T00:00:00Z',
          },
          {
            comic_id: 'comic_1',
            chapter_id: 'ch_remote_old',
            chapter_number: 10,
            updated_at: '2026-02-01T00:00:00Z',
          },
          {
            comic_id: 'comic_2',
            chapter_id: 'ch_remote_new',
            chapter_number: 25,
            updated_at: '2026-08-01T00:00:00Z',
          },
          {
            comic_id: 'comic_4',
            chapter_id: 'ch_remote_only',
            chapter_number: 1,
            updated_at: '2026-04-01T00:00:00Z',
          },
        ]),
        saveHistory: vi.fn().mockResolvedValue({ success: true }),
      };

      const result = await manager.syncWithGateway(mockUserClient);

      // Local comic_1 was newer -> pushed to remote via saveHistory
      expect(result.syncedCount).toBe(1);
      expect(mockUserClient.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({ comicId: 'comic_1', chapterNumber: 15 }),
      );

      // Remote comic_2 (newer) and comic_4 (remote-only) resolved into local
      expect(result.resolvedCount).toBe(2);

      // Verify Comic 2 was updated with remote state
      const comic2 = await manager.getProgress('comic_2');
      expect(comic2?.chapterNumber).toBe(25);
      expect(comic2?.chapterId).toBe('ch_remote_new');

      // Verify Comic 4 was imported into local progress
      const comic4 = await manager.getProgress('comic_4');
      expect(comic4).not.toBeNull();
      expect(comic4?.chapterNumber).toBe(1);

      // Verify Comic 1 is now marked synced
      const comic1 = await manager.getProgress('comic_1');
      expect(comic1?.synced).toBe(true);
    });

    it('handles out-of-order duplicate records for the same comic from remote history', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new ReaderProgressManager({ storage });

      // Local is at chapter 5 (2026-03-01)
      await storage.setItem('reader:progress:c_dup', {
        comicId: 'c_dup',
        chapterId: 'ch5',
        chapterNumber: 5,
        updatedAt: '2026-03-01T00:00:00Z',
        synced: false,
      });
      await storage.setItem('reader:progress_index', ['c_dup']);

      // Remote history returns duplicate records out of order:
      // First is a newer update (chapter 10, 2026-05-01)
      // Second is an older update (chapter 2, 2026-01-01)
      const mockUserClient = {
        getHistory: vi.fn().mockResolvedValue([
          { comic_id: 'c_dup', chapter_id: 'ch10', chapter_number: 10, updated_at: '2026-05-01T00:00:00Z' },
          { comic_id: 'c_dup', chapter_id: 'ch2', chapter_number: 2, updated_at: '2026-01-01T00:00:00Z' },
        ]),
        saveHistory: vi.fn().mockResolvedValue({ success: true }),
      };

      await manager.syncWithGateway(mockUserClient);

      // The true newest remote record was chapter 10 (2026-05-01), which is newer than local chapter 5 (2026-03-01).
      // Remote should win, resolving local to chapter 10.
      const resolved = await manager.getProgress('c_dup');
      expect(resolved?.chapterNumber).toBe(10);
    });

    it('re-throws network errors during sync without clearing un-synced local progress', async () => {
      const storage = new MemoryStorageAdapter();
      const onSyncError = vi.fn();
      const manager = new ReaderProgressManager({ storage, onSyncError });

      await manager.saveProgress({ comicId: 'c_fail', chapterId: 'ch1', chapterNumber: 1 });

      const failingClient = {
        getHistory: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
        saveHistory: vi.fn(),
      };

      await expect(manager.syncWithGateway(failingClient)).rejects.toThrow(
        '503 Service Unavailable',
      );
      expect(onSyncError).toHaveBeenCalled();

      // State is retained
      const item = await manager.getProgress('c_fail');
      expect(item).not.toBeNull();
      expect(item?.synced).toBe(false);
    });
  });

  // =========================================================================
  // 4. BookmarkManager - Offline Queueing, Deduplication & Remote Reconciliation
  // =========================================================================
  describe('4. BookmarkManager - Offline Queueing, Deduplication & Sync', () => {
    it('deduplicates offline mutations for the same comicId', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // Add comic_1 with chapter 1
      const firstAdd = await manager.addBookmark('comic_1', { chapterId: 'ch_1', chapterNumber: 1 });
      const originalCreatedAt = firstAdd.createdAt;

      // Duplicate add comic_1 with chapter 2
      const secondAdd = await manager.addBookmark('comic_1', { chapterId: 'ch_2', chapterNumber: 2 });

      // createdAt must be preserved across duplicate additions
      expect(secondAdd.createdAt).toBe(originalCreatedAt);
      expect(secondAdd.chapterNumber).toBe(2);

      // Only one bookmark record exists for comic_1
      const list = await manager.listBookmarks();
      expect(list.length).toBe(1);
      expect(list[0].comicId).toBe('comic_1');
      expect(list[0].chapterNumber).toBe(2);

      // Verify underlying offline queue has only 1 mutation
      const queue = (await storage.getItem<Array<{ comicId: string }>>('reader:bookmark_queue')) || [];
      expect(queue.filter((m) => m.comicId === 'comic_1').length).toBe(1);
    });

    it('cancels out add-then-remove mutations cleanly in offline queue', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // Add comic_temp, then remove it
      await manager.addBookmark('comic_temp');
      expect(await manager.isBookmarked('comic_temp')).toBe(true);

      const removed = await manager.removeBookmark('comic_temp');
      expect(removed).toBe(true);
      expect(await manager.isBookmarked('comic_temp')).toBe(false);

      // The offline queue should now have REMOVE mutation (no stale ADD)
      const queue = (await storage.getItem<Array<{ type: string; comicId: string }>>('reader:bookmark_queue')) || [];
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('REMOVE');
      expect(queue[0].comicId).toBe('comic_temp');
    });

    it('handles rapid toggleBookmark stress and maintains consistent state', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // Toggle 20 times (even count -> should be unbookmarked)
      for (let i = 0; i < 20; i++) {
        await manager.toggleBookmark('comic_toggle');
      }
      expect(await manager.isBookmarked('comic_toggle')).toBe(false);

      // 21st toggle -> should be bookmarked
      const toggleRes = await manager.toggleBookmark('comic_toggle');
      expect(toggleRes.bookmarked).toBe(true);
      expect(await manager.isBookmarked('comic_toggle')).toBe(true);
    });

    it('reconciles offline queued mutations and remote bookmarks bi-directionally', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // User performs offline operations:
      // 1. Add c1
      await manager.addBookmark('c1', { chapterId: 'ch1', chapterNumber: 1 });
      // 2. Add c2 then remove c2
      await manager.addBookmark('c2');
      await manager.removeBookmark('c2');
      // 3. Add c3
      await manager.addBookmark('c3');

      // Remote Gateway already contains:
      // - c4 (created on another device)
      // - c2 (was previously bookmarked on remote, will be removed)
      const mockUserClient = {
        getBookmarks: vi.fn().mockResolvedValue([
          { comic_id: 'c4', created_at: '2026-01-01T00:00:00Z' },
          { comic_id: 'c1', created_at: '2026-01-02T00:00:00Z' },
        ]),
        addBookmark: vi.fn().mockResolvedValue({ success: true }),
        removeBookmark: vi.fn().mockResolvedValue({ success: true }),
      };

      const syncResult = await manager.syncWithGateway(mockUserClient);

      // 2 ADD mutations (c1, c3) and 1 REMOVE mutation (c2) executed
      expect(syncResult.addedCount).toBe(2);
      expect(syncResult.removedCount).toBe(1);
      expect(mockUserClient.addBookmark).toHaveBeenCalledWith('c1');
      expect(mockUserClient.addBookmark).toHaveBeenCalledWith('c3');
      expect(mockUserClient.removeBookmark).toHaveBeenCalledWith('c2');

      // Local list must contain c1, c3, and remote-imported c4
      const bookmarks = await manager.listBookmarks();
      const ids = bookmarks.map((b) => b.comicId).sort();
      expect(ids).toEqual(['c1', 'c3', 'c4']);

      // c2 is not bookmarked
      expect(await manager.isBookmarked('c2')).toBe(false);

      // Queue is emptied after successful reconciliation
      const storedQueue = await storage.getItem<unknown[]>('reader:bookmark_queue');
      expect(storedQueue).toEqual([]);
    });

    it('preserves offline mutations when gateway remote call fails during sync', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      await manager.addBookmark('offline_comic');

      const failingClient = {
        getBookmarks: vi.fn(),
        addBookmark: vi.fn().mockRejectedValue(new Error('Network disconnected')),
        removeBookmark: vi.fn(),
      };

      await expect(manager.syncWithGateway(failingClient)).rejects.toThrow(
        'Network disconnected',
      );

      // Queue must NOT be cleared on failure
      const queue = (await storage.getItem<Array<{ comicId: string }>>('reader:bookmark_queue')) || [];
      expect(queue.length).toBe(1);
      expect(queue[0].comicId).toBe('offline_comic');
    });

    it('handles concurrent bookmark additions without losing bookmarks or queue items', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new BookmarkManager({ storage });

      // Concurrently add 10 bookmarks on fresh instance
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => manager.addBookmark(`c_${i}`)),
      );

      const list = await manager.listBookmarks();
      expect(list.length).toBe(10);
    });
  });
});
