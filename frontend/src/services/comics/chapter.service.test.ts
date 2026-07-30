import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockApiClient = { get: vi.fn(), post: vi.fn() };
vi.mock('@/lib/api/apiClient', () => ({ apiClient: mockApiClient }));

beforeEach(() => { vi.clearAllMocks(); });

describe('fetchChapterById', () => {
  it('returns chapter on success', async () => {
    mockApiClient.get.mockResolvedValue({ id: 'ch1', title: 'The Beginning' });
    const { fetchChapterById } = await import('./chapter.service');
    expect(await fetchChapterById('ch1')).toEqual({ id: 'ch1', title: 'The Beginning' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/chapters?id=ch1');
  });

  it('returns null on API error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('fail'));
    const { fetchChapterById } = await import('./chapter.service');
    expect(await fetchChapterById('ch1')).toBeNull();
  });
});

describe('fetchChaptersByStoryId', () => {
  it('returns chapter array on success', async () => {
    mockApiClient.get.mockResolvedValue([{ id: 'ch1' }]);
    const { fetchChaptersByStoryId } = await import('./chapter.service');
    expect(await fetchChaptersByStoryId('story-1')).toHaveLength(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/chapters?storyId=story-1');
  });

  it('returns empty array on error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('fail'));
    const { fetchChaptersByStoryId } = await import('./chapter.service');
    expect(await fetchChaptersByStoryId('story-1')).toEqual([]);
  });
});

describe('saveChapter', () => {
  it('POSTs and returns chapter from object response', async () => {
    mockApiClient.post.mockResolvedValue({ chapter: { id: 'ch-new' } });
    const { saveChapter } = await import('./chapter.service');
    const result = await saveChapter({ title: 'New Chapter' });
    expect(result.id).toBe('ch-new');
  });

  it('handles array response from server', async () => {
    mockApiClient.post.mockResolvedValue([{ id: 'ch-new' }]);
    const { saveChapter } = await import('./chapter.service');
    const result = await saveChapter({ title: 'New Chapter' });
    expect(result.id).toBe('ch-new');
  });

  it('throws when server returns no record', async () => {
    mockApiClient.post.mockResolvedValue([]);
    const { saveChapter } = await import('./chapter.service');
    await expect(saveChapter({ title: 'New Chapter' })).rejects.toThrow('did not return the record');
  });

  it('throws when server returns empty object', async () => {
    mockApiClient.post.mockResolvedValue({ chapter: null });
    const { saveChapter } = await import('./chapter.service');
    await expect(saveChapter({ title: 'New Chapter' })).rejects.toThrow('did not return the record');
  });
});