import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryStorageAdapter } from '../storage/adapters';
import { ReaderProgressManager } from '../storage/reader/progress-tracker';

const record = (comicId: string, chapterNumber: number, updatedAt: unknown, synced = true) => ({
  comicId,
  chapterId: `${comicId}-ch`,
  chapterNumber,
  updatedAt,
  synced,
});

describe('ReaderProgressManager edge branches', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defaults storage, tolerates missing records and throttles the flush timer', async () => {
    vi.useFakeTimers();
    const manager = new ReaderProgressManager();

    expect(await manager.getProgress('missing')).toBeNull();
    expect(await manager.isChapterRead('missing', 1)).toBe(false);
    expect(await manager.getAllProgress()).toEqual([]);

    const first = await manager.saveProgress({ comicId: 'a', chapterId: 'a1', chapterNumber: 1 });
    const second = await manager.saveProgress({ comicId: 'b', chapterId: 'b2', chapterNumber: 2 });
    expect(await manager.getProgress('a')).toMatchObject({ chapterId: 'a1' });
    expect(await manager.getProgress('b')).toMatchObject({ chapterId: 'b2' });

    await manager.flush();
    vi.advanceTimersByTime(2000);
    expect(first.comicId).toBe('a');
    expect(second.comicId).toBe('b');
  });

  it('sorts numeric, invalid and ISO timestamps while skipping ghost index ids', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.setItem('reader:progress_index', ['ghost', 'num', 'bad', 'iso']);
    await storage.setItem('reader:progress:num', record('num', 1, 100));
    await storage.setItem('reader:progress:bad', record('bad', 2, 'not-a-date'));
    await storage.setItem('reader:progress:iso', record('iso', 3, '2026-01-01T00:00:00Z'));

    const manager = new ReaderProgressManager({ storage });
    const all = await manager.getAllProgress();
    expect(all.map((item) => item.comicId)).toEqual(['iso', 'num', 'bad']);
  });

  it('pushes unsynced local progress when remote history is not an array', async () => {
    const storage = new MemoryStorageAdapter();
    const saveHistory = vi.fn().mockResolvedValue({});
    const manager = new ReaderProgressManager({ storage });
    await manager.saveProgress({ comicId: 'local', chapterId: 'l', chapterNumber: 3 });

    const result = await manager.syncWithGateway({
      getHistory: vi.fn().mockResolvedValue({}),
      saveHistory,
    });

    expect(result).toEqual({ syncedCount: 1, resolvedCount: 0 });
    expect(saveHistory).toHaveBeenCalledTimes(1);
  });

  it('resolves LWW ties, clock skew, malformed remote ids and remote-only records', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.setItem('reader:progress_index', ['dup', 'dup2', 'skew', 'plain']);
    await storage.setItem('reader:progress:dup', record('dup', 5, -1, false));
    await storage.setItem('reader:progress:dup2', record('dup2', 1, -1, false));
    await storage.setItem('reader:progress:skew', record('skew', 1, -5, false));
    await storage.setItem('reader:progress:plain', record('plain', 1, -5, false));

    const remote = [
      { comic_id: 'dup', updated_at: 100, chapter_number: 4 },
      { comicId: 'dup', updatedAt: 200, chapterNumber: 4 },
      { comicId: 'dup', updatedAt: 200, chapterId: 'remote-ch', chapterNumber: 9 },
      { comicId: 'dup', updatedAt: 200 },
      { comic_id: 'dup2', updated_at: 100, chapter_number: 1 },
      { comicId: 'dup2', updated_at: 100, chapterNumber: 2 },
      { chapterNumber: 1 },
      { comic_id: 'skew', updated_at: 'bad' },
      { comicId: 'plain', updatedAt: 1, chapterNumber: 1 },
      { comicId: 'orphanA', updatedAt: 'bad', chapterId: 'oa' },
      { comicId: 'orphanB', updated_at: 0, chapterNumber: 7 },
      { comicId: 'orphanC', updated_at: 0 },
    ];

    const saveHistory = vi.fn().mockResolvedValue({});
    const manager = new ReaderProgressManager({ storage });
    const result = await manager.syncWithGateway({
      getHistory: vi.fn().mockResolvedValue(remote),
      saveHistory,
    });

    expect(result.resolvedCount).toBeGreaterThan(0);
    expect((await manager.getProgress('dup'))?.chapterId).toBe('remote-ch');
    expect((await manager.getProgress('skew'))?.synced).toBe(true);
    expect((await manager.getProgress('orphanA'))?.chapterId).toBe('oa');
    expect((await manager.getProgress('orphanC'))?.chapterNumber).toBe(1);
  });

  it('reports sync failures through the error callback', async () => {
    const onSyncError = vi.fn();
    const manager = new ReaderProgressManager({
      storage: new MemoryStorageAdapter(),
      onSyncError,
    });
    const failure = new Error('history down');

    await expect(
      manager.syncWithGateway({
        getHistory: vi.fn().mockRejectedValue(failure),
        saveHistory: vi.fn(),
      }),
    ).rejects.toBe(failure);
    expect(onSyncError).toHaveBeenCalledWith(failure);
  });
});
