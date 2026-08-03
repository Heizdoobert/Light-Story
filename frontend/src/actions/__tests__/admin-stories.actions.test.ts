import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateStoryStatus,
  featureStory,
  deleteStoryAdmin,
  updateStory,
  deleteStory,
  bulkUpdateStatus,
  bulkDeleteStories,
} from '../admin-stories.actions';
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

describe('admin-stories.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateStoryStatus', () => {
    it('updates status successfully and revalidates tags', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await updateStoryStatus({ id: 'story-1', status: 'published' });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStatus', id: 'story-1', status: 'published' }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });

    it('fails with invalid status or empty id', async () => {
      const result = await updateStoryStatus({ id: '', status: 'published' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    it('returns error message when fetchApi returns non-ok response', async () => {
      const mockRes = new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await updateStoryStatus({ id: 'story-1', status: 'archived' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('featureStory', () => {
    it('features story successfully with default isFeatured', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await featureStory({ id: 'story-1' });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'feature', id: 'story-1', isFeatured: true }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });

    it('unfeatures story successfully when isFeatured is false', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await featureStory({ id: 'story-1', isFeatured: false });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'feature', id: 'story-1', isFeatured: false }),
      });
    });
  });

  describe('deleteStoryAdmin', () => {
    it('deletes story as admin successfully and revalidates tags', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await deleteStoryAdmin({ id: 'story-99' });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id: 'story-99' }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });
  });

  describe('updateStory', () => {
    it('updates story title, description, status successfully', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await updateStory({
        id: 'story-1',
        title: 'New Title',
        description: 'New Desc',
        status: 'completed',
      });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          id: 'story-1',
          payload: { title: 'New Title', description: 'New Desc', status: 'completed' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });
  });

  describe('deleteStory', () => {
    it('deletes story successfully', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await deleteStory({ id: 'story-1' });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id: 'story-1' }),
      });
    });
  });

  describe('bulkUpdateStatus', () => {
    it('bulk updates story statuses successfully', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await bulkUpdateStatus({ ids: ['s1', 's2'], status: 'ongoing' });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'bulkUpdateStatus', ids: ['s1', 's2'], status: 'ongoing' }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });

    it('rejects empty ids array', async () => {
      const result = await bulkUpdateStatus({ ids: [], status: 'ongoing' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });
  });

  describe('bulkDeleteStories', () => {
    it('bulk deletes stories successfully', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const result = await bulkDeleteStories({ ids: ['s1', 's2'] });

      expect(result.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/manage-story', {
        method: 'POST',
        body: JSON.stringify({ action: 'bulkDelete', ids: ['s1', 's2'] }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin_stories', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('admin-dashboard-metrics', 'max');
    });
  });
});
