import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as systemSettingsModule from '@/services/admin/systemSettings.service';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: mockApiClient,
}));

vi.mock('@/services/admin/systemSettings.service', () => ({
  fetchSystemSettingsSnapshot: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getDashboardData', () => {
  it('returns stories and stats from API', async () => {
    mockApiClient.get.mockResolvedValue({
      stories: [{ id: 's1', views: 10 }, { id: 's2', views: 20 }],
      stats: { totalStories: 2, totalChapters: 5, activeStories: 1, totalViews: 30 },
    });

    const { getDashboardData } = await import('./admin.service');
    const result = await getDashboardData();

    expect(result.stories).toHaveLength(2);
    expect(result.stats.totalViews).toBe(30);
    expect(result.stats.totalChapters).toBe(5);
    expect(result.syncedAt).toBeDefined();
  });

  it('computes totalViews from stories when stats missing', async () => {
    mockApiClient.get.mockResolvedValue({
      stories: [{ views: 10 }, { views: 20 }],
    });

    const { getDashboardData } = await import('./admin.service');
    const result = await getDashboardData();

    expect(result.stats.totalViews).toBe(30);
  });

  it('returns empty defaults on error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('API down'));

    const { getDashboardData } = await import('./admin.service');
    const result = await getDashboardData();

    expect(result.stories).toEqual([]);
    expect(result.stats.totalViews).toBe(0);
  });
});

describe('getUiSettings', () => {
  it('delegates to fetchSystemSettingsSnapshot', async () => {
    const mockSettings = { compactMode: true, showSyncBadge: false };
    vi.mocked(systemSettingsModule.fetchSystemSettingsSnapshot).mockResolvedValue(mockSettings as any);

    const { getUiSettings } = await import('./admin.service');
    const result = await getUiSettings();

    expect(systemSettingsModule.fetchSystemSettingsSnapshot).toHaveBeenCalled();
    expect(result).toEqual(mockSettings);
  });
});

describe('getStoriesFieldValues', () => {
  it('calls API with encoded field param', async () => {
    mockApiClient.get.mockResolvedValue([{ id: 'cat-1', name: 'Fantasy' }]);

    const { getStoriesFieldValues } = await import('./admin.service');
    const result = await getStoriesFieldValues('category');

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/stories/field-values?field=category');
    expect(result).toHaveLength(1);
  });
});

describe('count functions', () => {
  it('getProfileCount returns count from API', async () => {
    mockApiClient.get.mockResolvedValue({ count: 42 });

    const { getProfileCount } = await import('./admin.service');
    expect(await getProfileCount()).toBe(42);
  });

  it('getChapterCount returns count from API', async () => {
    mockApiClient.get.mockResolvedValue({ count: 7 });

    const { getChapterCount } = await import('./admin.service');
    expect(await getChapterCount()).toBe(7);
  });

  it('getAdSettingsCount returns count from API', async () => {
    mockApiClient.get.mockResolvedValue({ count: 3 });

    const { getAdSettingsCount } = await import('./admin.service');
    expect(await getAdSettingsCount()).toBe(3);
  });

  it('count functions return 0 on error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('err'));

    const { getProfileCount, getChapterCount, getAdSettingsCount } = await import('./admin.service');
    expect(await getProfileCount()).toBe(0);
    expect(await getChapterCount()).toBe(0);
    expect(await getAdSettingsCount()).toBe(0);
  });
});

describe('getRoleDistribution', () => {
  it('returns role array from API', async () => {
    mockApiClient.get.mockResolvedValue([{ role: 'admin', total: 2 }]);

    const { getRoleDistribution } = await import('./admin.service');
    const result = await getRoleDistribution();

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('admin');
  });

  it('returns empty array on error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('err'));

    const { getRoleDistribution } = await import('./admin.service');
    expect(await getRoleDistribution()).toEqual([]);
  });
});

describe('fetchProfiles', () => {
  it('fetches profiles page', async () => {
    mockApiClient.get.mockResolvedValue([{ id: 'p1' }]);

    const { fetchProfiles } = await import('./admin.service');
    const result = await fetchProfiles();

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/profiles?page=1&pageSize=500');
    expect(result).toHaveLength(1);
  });
});

describe('updateProfileRole / updateProfileName', () => {
  it('updateProfileRole POSTs action', async () => {
    mockApiClient.post.mockResolvedValue({});

    const { updateProfileRole } = await import('./admin.service');
    await updateProfileRole('p1', 'moderator');

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/profiles', {
      action: 'updateRole', id: 'p1', role: 'moderator',
    });
  });

  it('updateProfileName POSTs action with name', async () => {
    mockApiClient.post.mockResolvedValue({});

    const { updateProfileName } = await import('./admin.service');
    await updateProfileName('p1', 'New Name');

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/admin/profiles', {
      action: 'updateName', id: 'p1', full_name: 'New Name',
    });
  });
});

describe('callManageUserFunction', () => {
  const body = { action: 'createUser', email: 'test@test.com' };

  it('returns data on success', async () => {
    mockApiClient.post.mockResolvedValue({ id: 'u1' });

    const { callManageUserFunction } = await import('./admin.service');
    const result = await callManageUserFunction(body);

    expect(result.data).toEqual({ id: 'u1' });
    expect(result.error).toBeNull();
  });

  it('returns error on API failure without fallback', async () => {
    mockApiClient.post.mockRejectedValue({ message: 'Bad request', status: 400 });

    const { callManageUserFunction } = await import('./admin.service');
    const result = await callManageUserFunction(body);

    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('falls back to edge function on server error with env set', async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: 'mock-token' }));

    mockApiClient.post.mockRejectedValue({ message: 'createUser failed', status: 500 });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'u1' }),
    } as Response);

    const { callManageUserFunction } = await import('./admin.service');
    const result = await callManageUserFunction(body);

    expect(fetch).toHaveBeenCalledWith(
      'https://supabase.test/functions/v1/manage-user',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-key',
          Authorization: 'Bearer mock-token',
        }),
      }),
    );
    expect(result.data).toEqual({ id: 'u1' });
    expect(result.error).toBeNull();
  });

  it('returns error when edge function also fails', async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
    localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: 'mock-token' }));

    mockApiClient.post.mockRejectedValue({ message: 'createUser failed', status: 500 });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'Bad gateway' }),
    } as Response);

    const { callManageUserFunction } = await import('./admin.service');
    const result = await callManageUserFunction(body);

    expect(result.error).toBeDefined();
  });
});

describe('getAuditLogs', () => {
  it('fetches audit logs with default limit', async () => {
    mockApiClient.get.mockResolvedValue([{ action: 'test' }]);

    const { getAuditLogs } = await import('./admin.service');
    const result = await getAuditLogs();

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/audit?limit=200');
    expect(result).toHaveLength(1);
  });
});

describe('getProfilesByIds', () => {
  it('returns empty array for empty ids', async () => {
    const { getProfilesByIds } = await import('./admin.service');
    expect(await getProfilesByIds([])).toEqual([]);
  });

  it('fetches profiles by comma-joined ids', async () => {
    mockApiClient.get.mockResolvedValue([{ id: 'p1' }]);

    const { getProfilesByIds } = await import('./admin.service');
    const result = await getProfilesByIds(['p1', 'p2']);

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/admin/profiles/by-ids?ids=p1%2Cp2');
    expect(result).toHaveLength(1);
  });
});

describe('getSystemNotifications', () => {
  it('returns notifications from API', async () => {
    mockApiClient.get.mockResolvedValue({ notifications: [{ id: 1, message: 'Test' }] });

    const { getSystemNotifications } = await import('./admin.service');
    const result = await getSystemNotifications();

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Test');
  });

  it('returns empty array on auth errors', async () => {
    mockApiClient.get.mockRejectedValue({ status: 403 });

    const { getSystemNotifications } = await import('./admin.service');
    expect(await getSystemNotifications()).toEqual([]);
  });
});