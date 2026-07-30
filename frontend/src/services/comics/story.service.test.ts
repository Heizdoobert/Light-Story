import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('fetchStories', () => {
  it('returns array directly when response is array', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.get).mockResolvedValue([{ id: 's1' }]);
    const { fetchStories } = await import('./story.service');

    const result = await fetchStories();
    expect(result).toEqual([{ id: 's1' }]);
  });

  it('unwraps items when response is object', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.get).mockResolvedValue({ items: [{ id: 's2' }] });
    const { fetchStories } = await import('./story.service');

    const result = await fetchStories();
    expect(result).toEqual([{ id: 's2' }]);
  });
});

describe('fetchStoryById', () => {
  it('returns the story', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.get).mockResolvedValue({ id: 's1', title: 'Test' });
    const { fetchStoryById } = await import('./story.service');

    expect(await fetchStoryById('s1')).toEqual({ id: 's1', title: 'Test' });
  });
});

describe('incrementViews', () => {
  it('posts storyId', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue(undefined);
    const { incrementViews } = await import('./story.service');

    await incrementViews('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/stories/views', { storyId: 's1' });
  });
});

describe('saveStory', () => {
  it('returns story from array response', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue([{ id: 'new', title: 'New' }]);
    const { saveStory } = await import('./story.service');

    expect(await saveStory({ title: 'New' })).toEqual({ id: 'new', title: 'New' });
  });

  it('returns story from story key response', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue({ story: { id: 'new2', title: 'New2' } });
    const { saveStory } = await import('./story.service');

    expect(await saveStory({ title: 'New2' })).toEqual({ id: 'new2', title: 'New2' });
  });

  it('throws when no record returned', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue([]);
    const { saveStory } = await import('./story.service');

    await expect(saveStory({ title: 'X' })).rejects.toThrow('server did not return');
  });
});

describe('fetchStoriesPage', () => {
  it('builds query params and returns paginated result', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.get).mockResolvedValue({ items: [{ id: 's1' }], total: 1 });
    const { fetchStoriesPage } = await import('./story.service');

    const result = await fetchStoriesPage({ page: 1, pageSize: 10 });
    expect(result).toEqual({ items: [{ id: 's1' }], total: 1 });
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('page=1'));
  });

  it('handles array response', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.get).mockResolvedValue([{ id: 's1' }]);
    const { fetchStoriesPage } = await import('./story.service');

    const result = await fetchStoriesPage({ page: 1, pageSize: 10 });
    expect(result.items).toEqual([{ id: 's1' }]);
    expect(result.total).toBe(1);
  });
});

describe('updateStory', () => {
  it('updates and returns story from array', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue([{ id: 's1', title: 'Updated' }]);
    const { updateStory } = await import('./story.service');

    expect(await updateStory('s1', { title: 'Updated', description: 'd', status: 'published' }))
      .toEqual({ id: 's1', title: 'Updated' });
  });

  it('throws on empty response', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue([]);
    const { updateStory } = await import('./story.service');

    await expect(updateStory('s1', {} as any)).rejects.toThrow('Update failed');
  });
});

describe('deleteStory', () => {
  it('posts delete action', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue(undefined);
    const { deleteStory } = await import('./story.service');

    await deleteStory('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/api/admin/manage-story', { action: 'delete', id: 's1' });
  });
});

describe('bulkUpdateStatus', () => {
  it('posts bulk update', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue(undefined);
    const { bulkUpdateStatus } = await import('./story.service');

    await bulkUpdateStatus(['s1', 's2'], 'published');
    expect(apiClient.post).toHaveBeenCalledWith('/api/admin/manage-story', { action: 'bulkUpdateStatus', ids: ['s1', 's2'], status: 'published' });
  });
});

describe('bulkDeleteStories', () => {
  it('posts bulk delete', async () => {
    const { apiClient } = await import('@/lib/api/apiClient');
    vi.mocked(apiClient.post).mockResolvedValue(undefined);
    const { bulkDeleteStories } = await import('./story.service');

    await bulkDeleteStories(['s1']);
    expect(apiClient.post).toHaveBeenCalledWith('/api/admin/manage-story', { action: 'bulkDelete', ids: ['s1'] });
  });
});