import { describe, it, expect, vi, beforeEach } from 'vitest';
import { incrementStoryView } from '../stories.actions';
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

describe('stories.actions - incrementStoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments view count successfully with string storyId input', async () => {
    const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await incrementStoryView('story-123');

    expect(result.success).toBe(true);
    expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/stories/views', {
      method: 'POST',
      body: JSON.stringify({ storyId: 'story-123' }),
    });
    expect(nextCache.revalidateTag).toHaveBeenCalledWith('stories', 'max');
  });

  it('increments view count successfully with object input { storyId }', async () => {
    const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await incrementStoryView({ storyId: 'story-456' });

    expect(result.success).toBe(true);
    expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/stories/views', {
      method: 'POST',
      body: JSON.stringify({ storyId: 'story-456' }),
    });
    expect(nextCache.revalidateTag).toHaveBeenCalledWith('stories', 'max');
  });

  it('returns failure when input is empty or invalid', async () => {
    const resEmpty = await incrementStoryView('');
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.error).toContain('Invalid input');

    const resNull = await incrementStoryView(null as any);
    expect(resNull.success).toBe(false);
    expect(resNull.error).toContain('Invalid input');
  });

  it('handles backend API error response', async () => {
    const mockRes = new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 });
    vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

    const result = await incrementStoryView('non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Story not found');
  });
});
