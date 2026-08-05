import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTranslator, addTranslator, updateTranslator, deleteTranslator, removeTranslator } from '../translators.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('translators.actions server actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('createTranslator / addTranslator', () => {
    it('creates translator and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'trans-1' }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await createTranslator({
        name: 'Test Translator',
        contact: 'test@example.com',
        notes: 'Some notes',
        status: 'active',
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/translators');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        name: 'Test Translator',
        contact: 'test@example.com',
        notes: 'Some notes',
        status: 'active',
      });
      expect(revalidateTag).toHaveBeenCalledWith('translators', 'max');
    });

    it('addTranslator alias works identically to createTranslator', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'trans-2' }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await addTranslator({ name: 'Alias Translator' });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('translators', 'max');
    });

    it('returns error when input validation fails (e.g. empty name)', async () => {
      const res = await createTranslator({ name: '' });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('returns error message when backend responds with error status', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await createTranslator({ name: 'Test Translator' });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('updateTranslator', () => {
    it('updates translator and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'trans-1' }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateTranslator({
        id: 'trans-1',
        name: 'Updated Name',
        status: 'inactive',
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/translators/trans-1');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual({
        name: 'Updated Name',
        contact: undefined,
        notes: undefined,
        status: 'inactive',
      });
      expect(revalidateTag).toHaveBeenCalledWith('translators', 'max');
    });

    it('returns error when input validation fails (e.g. empty id)', async () => {
      const res = await updateTranslator({ id: '', name: 'Test' });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('deleteTranslator / removeTranslator', () => {
    it('deletes translator and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await deleteTranslator({ id: 'trans-1' });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/translators/trans-1');
      expect(options.method).toBe('DELETE');
      expect(revalidateTag).toHaveBeenCalledWith('translators', 'max');
    });

    it('removeTranslator alias works identically to deleteTranslator', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await removeTranslator({ id: 'trans-2' });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('translators', 'max');
    });

    it('returns error when input validation fails (e.g. empty id)', async () => {
      const res = await removeTranslator({ id: '' });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });
});
