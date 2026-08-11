import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleStoryLike, incrementStoryView } from '../story.actions';
import * as httpModule from '../http';
import * as nextCache from 'next/cache';

vi.mock('../http', () => ({
  fetchApi: vi.fn(),
  messageFromResponse: vi.fn(async (res: Response) => {
    try {
      const data: any = await res.json();
      return data.error || 'Server error';
    } catch {
      return res.statusText || 'Server error';
    }
  }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('story.actions - toggleStoryLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles story like successfully with string storyId input', async () => {
    const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await toggleStoryLike('story-123');

    expect(result.success).toBe(true);
    expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/rpc/toggle_story_like', {
      method: 'POST',
      body: JSON.stringify({ story_id_param: 'story-123' }),
    });
    expect(nextCache.revalidateTag).toHaveBeenCalledWith('story', 'max');
  });

  it('toggles story like successfully with object input { storyId }', async () => {
    const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await toggleStoryLike({ storyId: 'story-456' });

    expect(result.success).toBe(true);
    expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/rpc/toggle_story_like', {
      method: 'POST',
      body: JSON.stringify({ story_id_param: 'story-456' }),
    });
    expect(nextCache.revalidateTag).toHaveBeenCalledWith('story', 'max');
  });

  it('returns failure when input is empty or invalid', async () => {
    const resEmpty = await toggleStoryLike('');
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error).toContain('Invalid input');

    const resNull = await toggleStoryLike(null as any);
    expect(resNull.success).toBe(false);
    expect(resNull.error).toContain('Invalid input');
  });

  it('handles backend API error response', async () => {
    const mockRes = new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await toggleStoryLike('non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Story not found');
  });

  it('re-exports incrementStoryView from stories.actions', () => {
    expect(typeof incrementStoryView).toBe('function');
  });
});
