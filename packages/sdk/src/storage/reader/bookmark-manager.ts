import { StorageAdapter } from '../adapters/adapter.interface';
import { createStorageAdapter } from '../adapters/factory';
import { BookmarkMutation, BookmarkRecord, BookmarkSyncOptions } from './types';

export class BookmarkManager {
  private storage: StorageAdapter;
  private onSyncSuccess?: () => void;
  private onSyncError?: (error: unknown) => void;

  private cache = new Map<string, BookmarkRecord>();
  private queue: BookmarkMutation[] = [];
  private initialized = false;

  private storageKey = 'reader:bookmarks';
  private queueKey = 'reader:bookmark_queue';

  constructor(options: BookmarkSyncOptions = {}) {
    this.storage = options.storage ?? createStorageAdapter({ prefix: 'ls:' });
    this.onSyncSuccess = options.onSyncSuccess;
    this.onSyncError = options.onSyncError;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const stored = (await this.storage.getItem<BookmarkRecord[]>(this.storageKey)) || [];
    this.cache.clear();
    for (const b of stored) {
      this.cache.set(b.comicId, b);
    }

    const storedQueue = (await this.storage.getItem<BookmarkMutation[]>(this.queueKey)) || [];
    this.queue = storedQueue;

    this.initialized = true;
  }

  private async persist(): Promise<void> {
    const list = Array.from(this.cache.values());
    await this.storage.setItem(this.storageKey, list);
    await this.storage.setItem(this.queueKey, this.queue);
  }

  /**
   * Adds a comic to local bookmarks optimistically and enqueues sync mutation.
   */
  public async addBookmark(
    comicId: string,
    meta?: { chapterId?: string; chapterNumber?: number },
  ): Promise<BookmarkRecord> {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const existing = this.cache.get(comicId);
    const record: BookmarkRecord = {
      comicId,
      chapterId: meta?.chapterId ?? existing?.chapterId,
      chapterNumber: meta?.chapterNumber ?? existing?.chapterNumber,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      synced: false,
    };

    this.cache.set(comicId, record);

    // Queue mutation
    this.queue = this.queue.filter((m) => m.comicId !== comicId);
    this.queue.push({
      type: 'ADD',
      comicId,
      chapterId: meta?.chapterId,
      chapterNumber: meta?.chapterNumber,
      timestamp: Date.now(),
    });

    await this.persist();
    return record;
  }

  /**
   * Removes a comic from local bookmarks and enqueues remove mutation.
   */
  public async removeBookmark(comicId: string): Promise<boolean> {
    await this.ensureInitialized();

    const existed = this.cache.has(comicId);
    if (!existed) {
      return false;
    }

    this.cache.delete(comicId);

    // Queue mutation
    this.queue = this.queue.filter((m) => m.comicId !== comicId);
    this.queue.push({
      type: 'REMOVE',
      comicId,
      timestamp: Date.now(),
    });

    await this.persist();
    return true;
  }

  /**
   * Toggles bookmark state for a comic.
   */
  public async toggleBookmark(
    comicId: string,
    meta?: { chapterId?: string; chapterNumber?: number },
  ): Promise<{ bookmarked: boolean }> {
    const bookmarked = await this.isBookmarked(comicId);
    if (bookmarked) {
      await this.removeBookmark(comicId);
      return { bookmarked: false };
    } else {
      await this.addBookmark(comicId, meta);
      return { bookmarked: true };
    }
  }

  /**
   * Checks whether a comic is bookmarked.
   */
  public async isBookmarked(comicId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.cache.has(comicId);
  }

  /**
   * Lists all bookmarks ordered by creation date descending.
   */
  public async listBookmarks(): Promise<BookmarkRecord[]> {
    await this.ensureInitialized();
    return Array.from(this.cache.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Synchronizes local bookmark mutations and reconciles state with the remote Gateway.
   */
  public async syncWithGateway(userClient: {
    getBookmarks: (pageSize?: number, options?: unknown) => Promise<unknown[]>;
    addBookmark: (comicId: string, options?: unknown) => Promise<unknown>;
    removeBookmark: (comicId: string, options?: unknown) => Promise<unknown>;
  }): Promise<{ addedCount: number; removedCount: number }> {
    await this.ensureInitialized();

    let addedCount = 0;
    let removedCount = 0;

    try {
      // 1. Process queued mutations
      const mutationsToProcess = [...this.queue];
      for (const mutation of mutationsToProcess) {
        if (mutation.type === 'ADD') {
          await userClient.addBookmark(mutation.comicId);
          addedCount++;
        } else if (mutation.type === 'REMOVE') {
          await userClient.removeBookmark(mutation.comicId);
          removedCount++;
        }
      }

      this.queue = [];

      // 2. Fetch remote bookmarks
      const rawRemote = await userClient.getBookmarks(100);
      const remoteList = Array.isArray(rawRemote) ? rawRemote : [];

      for (const item of remoteList) {
        const itemObj = item as Record<string, unknown>;
        const comicId = (itemObj.comic_id || itemObj.comicId) as string;
        if (comicId) {
          const local = this.cache.get(comicId);
          if (local) {
            local.synced = true;
          } else {
            const createdAt =
              (itemObj.created_at as string) || new Date().toISOString();
            this.cache.set(comicId, {
              comicId,
              createdAt,
              updatedAt: createdAt,
              synced: true,
            });
          }
        }
      }

      await this.persist();
      this.onSyncSuccess?.();

      return { addedCount, removedCount };
    } catch (err) {
      this.onSyncError?.(err);
      throw err;
    }
  }
}
