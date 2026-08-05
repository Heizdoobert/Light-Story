import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAdConfig, updateSiteSetting, updateAdSlot, toggleAdSlot } from '../ads.actions';
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

describe('ads.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAdConfig', () => {
    it('calls fetchApi and revalidates site_settings and ad_slots tags on success', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateAdConfig({ key: 'public_ads_enabled', value: true });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/site-settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'public_ads_enabled', value: true }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('ad_slots', 'max');
    });

    it('returns error when input key is empty', async () => {
      const res = await updateAdConfig({ key: '', value: true });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
    });

    it('handles backend error response', async () => {
      const mockRes = new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateAdConfig({ key: 'public_ads_enabled', value: false });
      expect(res.success).toBe(false);
      expect(res.error).toBe('Permission denied');
    });
  });

  describe('updateSiteSetting', () => {
    it('calls updateAdConfig and revalidates tags', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateSiteSetting({ key: 'ad_header', value: '<div>ad</div>' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/site-settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'ad_header', value: '<div>ad</div>' }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('ad_slots', 'max');
    });
  });

  describe('updateAdSlot', () => {
    it('calls fetchApi with slot and code and revalidates tags on success', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await updateAdSlot({ slot: 'ad_header', code: '<script>banner</script>' });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/site-settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'ad_header', value: '<script>banner</script>' }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('ad_slots', 'max');
    });

    it('returns error when slot is empty', async () => {
      const res = await updateAdSlot({ slot: '', code: 'content' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
    });
  });

  describe('toggleAdSlot', () => {
    it('toggles global ad state when slot is omitted', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await toggleAdSlot({ enabled: false });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/site-settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'public_ads_enabled', value: false }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('ad_slots', 'max');
    });

    it('toggles specified slot when slot is provided', async () => {
      const mockRes = new Response(JSON.stringify({ success: true }), { status: 200 });
      vi.mocked(httpModule.fetchApi).mockResolvedValue(mockRes as any);

      const res = await toggleAdSlot({ slot: 'ad_sidebar', enabled: true });
      expect(res.success).toBe(true);
      expect(httpModule.fetchApi).toHaveBeenCalledWith('/api/admin/site-settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'ad_sidebar', value: true }),
      });
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('site_settings', 'max');
      expect(nextCache.revalidateTag).toHaveBeenCalledWith('ad_slots', 'max');
    });
  });
});
