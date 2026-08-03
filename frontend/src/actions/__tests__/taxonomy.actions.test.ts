import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  createGenre,
  updateGenre,
  deleteGenre,
  createTag,
  updateTag,
  deleteTag,
} from '../taxonomy.actions';
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

describe('taxonomy.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Category Actions', () => {
    it('createCategory calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await createCategory({ name: 'Sci-Fi', description: 'Science Fiction' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'category',
          action: 'create',
          payload: { name: 'Sci-Fi', description: 'Science Fiction' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('updateCategory calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateCategory({ id: 'cat-1', name: 'Science Fiction', description: 'Updated' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'category',
          action: 'update',
          id: 'cat-1',
          payload: { name: 'Science Fiction', description: 'Updated' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('deleteCategory calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await deleteCategory({ id: 'cat-1' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'category',
          action: 'delete',
          id: 'cat-1',
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });
  });

  describe('Author Actions', () => {
    it('createAuthor calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await createAuthor({ name: 'John Doe', bio: 'Author bio' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'author',
          action: 'create',
          payload: { name: 'John Doe', bio: 'Author bio' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('updateAuthor calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateAuthor({ id: 'auth-1', name: 'Jane Doe', bio: 'Updated bio' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'author',
          action: 'update',
          id: 'auth-1',
          payload: { name: 'Jane Doe', bio: 'Updated bio' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('deleteAuthor calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await deleteAuthor({ id: 'auth-1' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'author',
          action: 'delete',
          id: 'auth-1',
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });
  });

  describe('Genre Actions', () => {
    it('createGenre calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await createGenre({ name: 'Fantasy', description: 'High fantasy' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'genre',
          action: 'create',
          payload: { name: 'Fantasy', description: 'High fantasy' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('updateGenre calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateGenre({ id: 'gen-1', name: 'Dark Fantasy', description: 'Grim fantasy' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'genre',
          action: 'update',
          id: 'gen-1',
          payload: { name: 'Dark Fantasy', description: 'Grim fantasy' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('deleteGenre calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await deleteGenre({ id: 'gen-1' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'genre',
          action: 'delete',
          id: 'gen-1',
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });
  });

  describe('Tag Actions', () => {
    it('createTag calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await createTag({ name: 'Isekai', description: 'Reincarnation stories' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'tag',
          action: 'create',
          payload: { name: 'Isekai', description: 'Reincarnation stories' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('updateTag calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateTag({ id: 'tag-1', name: 'OP MC', description: 'Overpowered main character' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'tag',
          action: 'update',
          id: 'tag-1',
          payload: { name: 'OP MC', description: 'Overpowered main character' },
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });

    it('deleteTag calls fetchApi and revalidates tag', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await deleteTag({ id: 'tag-1' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/taxonomy', {
        method: 'POST',
        body: JSON.stringify({
          entity: 'tag',
          action: 'delete',
          id: 'tag-1',
        }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('taxonomy', 'max');
    });
  });

  describe('Validation & Error handling', () => {
    it('returns error when input name is empty', async () => {
      const res = await createCategory({ name: '' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
    });

    it('handles backend error response', async () => {
      const mockRes = new Response(JSON.stringify({ error: 'Duplicate entry' }), { status: 400 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await createCategory({ name: 'Duplicate' });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Duplicate entry');
    });
  });
});
