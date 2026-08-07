import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveSystemSettings, updateSystemSettings } from '../system-settings.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';
import { SITE_SETTING_KEYS } from '@/lib/admin/system-settings';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('system-settings.actions server actions', () => {
  const originalEnv = process.env;

  const validPayload = {
    compactMode: true,
    showSyncBadge: false,
    dashboardTabVisibility: {
      superadmin: ['dashboard', 'stories'],
      admin: ['dashboard'],
      employee: ['dashboard'],
      user: [],
    },
    sidebarMenuVisibility: {
      superadmin: ['dashboard', 'stories'],
      admin: ['dashboard'],
      employee: ['dashboard'],
      user: [],
    },
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('saveSystemSettings', () => {
    it('persists system settings and calls revalidateTag when valid input and backend succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
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

      const res = await saveSystemSettings(validPayload);

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/site-settings');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.payload).toEqual([
        { key: SITE_SETTING_KEYS.uiCompactMode, value: true },
        { key: SITE_SETTING_KEYS.uiShowSyncBadge, value: false },
        { key: SITE_SETTING_KEYS.dashboardTabVisibility, value: validPayload.dashboardTabVisibility },
        { key: SITE_SETTING_KEYS.sidebarMenuVisibility, value: validPayload.sidebarMenuVisibility },
      ]);
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });

    it('returns error when input validation fails (invalid field type)', async () => {
      const invalidPayload = {
        ...validPayload,
        compactMode: 'not-a-boolean' as any,
      };

      const res = await saveSystemSettings(invalidPayload);

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('returns error when backend request fails', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'superadmin' } } },
            error: null,
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await saveSystemSettings(validPayload);

      expect(res.success).toBe(false);
      expect(res.error).toBe('Permission denied');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
    it('returns forbidden error when user lacks admin role', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: { role: 'user' } } },
            error: null,
          }),
        },
      } as any);

      const res = await saveSystemSettings(validPayload);

      expect(res.success).toBe(false);
      expect(res.error).toBe('Bạn không có quyền thực hiện thao tác này');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('updateSystemSettings', () => {
    it('calls saveSystemSettings under the hood and succeeds', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
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

      const res = await updateSystemSettings(validPayload);

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
    });
  });
});
