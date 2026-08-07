import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setMaintenanceMode, maintenanceMode, clearCache, triggerBackup } from '../ops.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('ops.actions server actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('setMaintenanceMode & maintenanceMode', () => {
    it('sets maintenance mode and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token-123' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await setMaintenanceMode({ enabled: true });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/site-settings');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ key: 'maintenance_mode', value: true });
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });

    it('maintenanceMode alias works identically', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token-123' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await maintenanceMode({ enabled: false });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });

    it('returns error when input validation fails', async () => {
      const res = await setMaintenanceMode({ enabled: 'invalid' as any });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('returns error when backend responds with error status', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await setMaintenanceMode({ enabled: true });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Forbidden');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('clears cache and calls revalidateTag', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token-123' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await clearCache({ target: 'cdn' });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/operations');
      expect(JSON.parse(options.body)).toEqual({ action: 'clearCache', target: 'cdn' });
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });

    it('uses default target "all" when default parameters are used', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token-123' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await clearCache();

      expect(res.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ action: 'clearCache', target: 'all' });
    });
  });

  describe('triggerBackup', () => {
    it('triggers backup and calls revalidateTag', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token-123' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await triggerBackup({ type: 'db' });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/operations');
      expect(JSON.parse(options.body)).toEqual({ action: 'triggerBackup', type: 'db' });
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });
  });
});
