import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: mockApiClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAdSettings', () => {
  it('returns rows from API when non-empty', async () => {
    const rows = [{ key: 'ad_header', value: '<div>ad</div>' }];
    mockApiClient.get.mockResolvedValue(rows);

    const { getAdSettings } = await import('./siteSettings.service');
    const result = await getAdSettings();

    expect(result).toEqual(rows);
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/api/admin/site-settings?keys=ad_header%2Cad_middle%2Cad_sidebar%2Cad_left_side%2Cad_right_side%2Cpublic_ads_enabled%2Cpublic_ad_min_height%2Cpublic_ad_refresh_seconds%2Cpublic_ad_allowed_hosts%2Cpublic_ad_blocked_terms',
    );
  });

  it('falls back to default rows when API returns empty', async () => {
    mockApiClient.get.mockResolvedValue([]);

    const { getAdSettings } = await import('./siteSettings.service');
    const result = await getAdSettings();

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((r: any) => r.key === 'public_ads_enabled')).toBe(true);
  });
});

describe('upsertAdSetting', () => {
  it('POSTs allowed key', async () => {
    mockApiClient.post.mockResolvedValue({});

    const { upsertAdSetting } = await import('./siteSettings.service');
    await upsertAdSetting('ad_header', '<div>ad</div>');

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/site-settings', {
      key: 'ad_header', value: '<div>ad</div>',
    });
  });

  it('throws for disallowed key', async () => {
    const { upsertAdSetting } = await import('./siteSettings.service');
    await expect(upsertAdSetting('evil_key', 'bad')).rejects.toThrow('Unsupported ad setting key');
  });
});