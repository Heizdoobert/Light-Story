import { StorageAdapter } from '../adapters/adapter.interface';
import { createStorageAdapter } from '../adapters/factory';
import { ProgressSyncOptions, ReadingProgressRecord } from './types';

/**
 * Safely parses timestamp from ISO strings, numbers, or unknown types into milliseconds.
 * Returns 0 if invalid or missing.
 */
function parseRecordTimestamp(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export class ReaderProgressManager {
  private storage: StorageAdapter;
  private debounceMs: number;
  private maxHistoryItems: number;
  private onSyncSuccess?: (records: ReadingProgressRecord[]) => void;
  private onSyncError?: (error: unknown) => void;

  private memoryCache = new Map<string, ReadingProgressRecord>();
  private pendingSync = new Map<string, ReadingProgressRecord>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private storagePrefix = 'reader:progress:';
  private indexKey = 'reader:progress_index';
  private indexLock: Promise<void> = Promise.resolve();

  constructor(options: ProgressSyncOptions = {}) {
    this.storage = options.storage ?? createStorageAdapter({ prefix: 'ls:' });
    this.debounceMs = options.debounceMs ?? 1000;
    this.maxHistoryItems = options.maxHistoryItems ?? 100;
    this.onSyncSuccess = options.onSyncSuccess;
    this.onSyncError = options.onSyncError;
  }

  /**
   * Serializes index read-modify-write operations across concurrent calls.
   */
  private async addToIndex(comicId: string): Promise<void> {
    const run = async () => {
      const raw = (await this.storage.getItem<string[]>(this.indexKey)) || [];
      const set = new Set(raw);
      set.delete(comicId);
      const updated = [comicId, ...Array.from(set)].slice(0, this.maxHistoryItems);
      await this.storage.setItem(this.indexKey, updated);
    };

    const nextLock = this.indexLock.catch(() => {}).then(run);
    this.indexLock = nextLock;
    await nextLock;
  }

  /**
   * Saves reading progress for a comic/chapter with optimistic local update.
   */
  public async saveProgress(data: {
    comicId: string;
    chapterId: string;
    chapterNumber: number;
    scrollPosition?: number;
    progressPercent?: number;
  }): Promise<ReadingProgressRecord> {
    const record: ReadingProgressRecord = {
      comicId: data.comicId,
      chapterId: data.chapterId,
      chapterNumber: data.chapterNumber,
      scrollPosition: data.scrollPosition,
      progressPercent: data.progressPercent,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    // Immediate memory update
    this.memoryCache.set(data.comicId, record);
    this.pendingSync.set(data.comicId, record);

    // Persist to storage
    await this.storage.setItem(`${this.storagePrefix}${data.comicId}`, record);
    await this.addToIndex(data.comicId);

    // Debounce flush
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.flush().catch(() => {});
    }, this.debounceMs);

    return record;
  }

  /**
   * Retrieves reading progress for a specific comic.
   */
  public async getProgress(comicId: string): Promise<ReadingProgressRecord | null> {
    if (this.memoryCache.has(comicId)) {
      return this.memoryCache.get(comicId)!;
    }

    const stored = await this.storage.getItem<ReadingProgressRecord>(
      `${this.storagePrefix}${comicId}`,
    );
    if (stored) {
      this.memoryCache.set(comicId, stored);
      return stored;
    }

    return null;
  }

  /**
   * Retrieves all reading progress records ordered by most recently updated.
   */
  public async getAllProgress(): Promise<ReadingProgressRecord[]> {
    await this.indexLock.catch(() => {});
    const ids = (await this.storage.getItem<string[]>(this.indexKey)) || [];
    const records: ReadingProgressRecord[] = [];

    for (const id of ids) {
      const record = await this.getProgress(id);
      if (record) {
        records.push(record);
      }
    }

    return records.sort(
      (a, b) => parseRecordTimestamp(b.updatedAt) - parseRecordTimestamp(a.updatedAt),
    );
  }

  /**
   * Checks if a chapter has already been read based on recorded progress.
   */
  public async isChapterRead(comicId: string, chapterNumber: number): Promise<boolean> {
    const progress = await this.getProgress(comicId);
    if (!progress) {
      return false;
    }
    return progress.chapterNumber >= chapterNumber;
  }

  /**
   * Flushes debounced timer and ensures pending mutations are persisted.
   */
  public async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Synchronizes local reading progress with the remote Gateway using Last-Write-Wins (LWW).
   */
  public async syncWithGateway(userClient: {
    getHistory: (options?: unknown) => Promise<unknown[]>;
    saveHistory: (data: Record<string, unknown>, options?: unknown) => Promise<unknown>;
  }): Promise<{ syncedCount: number; resolvedCount: number }> {
    let syncedCount = 0;
    let resolvedCount = 0;

    try {
      await this.flush();

      // 1. Fetch remote history records and deduplicate preserving newest timestamp per comic
      const rawRemote = await userClient.getHistory();
      const remoteList = Array.isArray(rawRemote) ? rawRemote : [];
      const remoteMap = new Map<string, Record<string, unknown>>();

      for (const item of remoteList) {
        const itemObj = item as Record<string, unknown>;
        const comicId = (itemObj.comic_id || itemObj.comicId) as string;
        if (comicId) {
          const existing = remoteMap.get(comicId);
          if (!existing) {
            remoteMap.set(comicId, itemObj);
          } else {
            const existingTime = parseRecordTimestamp(existing.updated_at ?? existing.updatedAt);
            const itemTime = parseRecordTimestamp(itemObj.updated_at ?? itemObj.updatedAt);
            const existingCh = Number(existing.chapter_number ?? existing.chapterNumber ?? 0);
            const itemCh = Number(itemObj.chapter_number ?? itemObj.chapterNumber ?? 0);

            if (itemTime > existingTime || (itemTime === existingTime && itemCh > existingCh)) {
              remoteMap.set(comicId, itemObj);
            }
          }
        }
      }

      // 2. Process all local records
      const localRecords = await this.getAllProgress();
      const localMap = new Map<string, ReadingProgressRecord>();

      for (const local of localRecords) {
        localMap.set(local.comicId, local);
        const remote = remoteMap.get(local.comicId);

        if (remote) {
          const remoteTime = parseRecordTimestamp(remote.updated_at ?? remote.updatedAt);
          const localTime = parseRecordTimestamp(local.updatedAt);

          if (remoteTime > localTime) {
            // Remote is newer: reconcile local with remote state
            const updated: ReadingProgressRecord = {
              comicId: local.comicId,
              chapterId: (remote.chapter_id || remote.chapterId || local.chapterId) as string,
              chapterNumber: Number(remote.chapter_number ?? remote.chapterNumber ?? local.chapterNumber),
              scrollPosition: local.scrollPosition,
              progressPercent: local.progressPercent,
              updatedAt: remoteTime > 0 ? new Date(remoteTime).toISOString() : new Date().toISOString(),
              synced: true,
            };
            this.memoryCache.set(local.comicId, updated);
            await this.storage.setItem(`${this.storagePrefix}${local.comicId}`, updated);
            resolvedCount++;
          } else if (!local.synced || localTime > remoteTime) {
            // Local is newer or pending sync: push to remote
            await userClient.saveHistory({
              comicId: local.comicId,
              chapterId: local.chapterId,
              chapterNumber: local.chapterNumber,
              lastPage: local.chapterNumber,
            });
            local.synced = true;
            this.memoryCache.set(local.comicId, local);
            await this.storage.setItem(`${this.storagePrefix}${local.comicId}`, local);
            syncedCount++;
          } else {
            local.synced = true;
            await this.storage.setItem(`${this.storagePrefix}${local.comicId}`, local);
          }
        } else if (!local.synced) {
          // Exists locally but not remotely: push to remote
          await userClient.saveHistory({
            comicId: local.comicId,
            chapterId: local.chapterId,
            chapterNumber: local.chapterNumber,
            lastPage: local.chapterNumber,
          });
          local.synced = true;
          this.memoryCache.set(local.comicId, local);
          await this.storage.setItem(`${this.storagePrefix}${local.comicId}`, local);
          syncedCount++;
        }
      }

      // 3. Process remote records that do not exist locally
      for (const [comicId, remote] of remoteMap.entries()) {
        if (!localMap.has(comicId)) {
          const rawTime = remote.updated_at ?? remote.updatedAt;
          const parsedTime = parseRecordTimestamp(rawTime);
          const newLocal: ReadingProgressRecord = {
            comicId,
            chapterId: (remote.chapter_id || remote.chapterId || '') as string,
            chapterNumber: Number(remote.chapter_number ?? remote.chapterNumber ?? 1),
            updatedAt: parsedTime > 0 ? new Date(parsedTime).toISOString() : new Date().toISOString(),
            synced: true,
          };
          this.memoryCache.set(comicId, newLocal);
          await this.storage.setItem(`${this.storagePrefix}${comicId}`, newLocal);
          await this.addToIndex(comicId);
          resolvedCount++;
        }
      }

      this.pendingSync.clear();
      this.onSyncSuccess?.(Array.from(this.memoryCache.values()));

      return { syncedCount, resolvedCount };
    } catch (err) {
      this.onSyncError?.(err);
      throw err;
    }
  }
}
