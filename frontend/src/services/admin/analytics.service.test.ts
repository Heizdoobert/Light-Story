import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pure helpers', () => {
  it('normalizeAnalyticsTimeRange passes valid values through', async () => {
    const { normalizeAnalyticsTimeRange } = await import('./analytics.service');
    expect(normalizeAnalyticsTimeRange('24h')).toBe('24h');
    expect(normalizeAnalyticsTimeRange('7d')).toBe('7d');
    expect(normalizeAnalyticsTimeRange('30d')).toBe('30d');
  });

  it('normalizeAnalyticsTimeRange defaults to 7d', async () => {
    const { normalizeAnalyticsTimeRange } = await import('./analytics.service');
    expect(normalizeAnalyticsTimeRange(null)).toBe('7d');
    expect(normalizeAnalyticsTimeRange('invalid')).toBe('7d');
  });

  it('analyticsTimeRangeToInterval maps correctly', async () => {
    const { analyticsTimeRangeToInterval } = await import('./analytics.service');
    expect(analyticsTimeRangeToInterval('24h')).toBe('24 hours');
    expect(analyticsTimeRangeToInterval('7d')).toBe('7 days');
    expect(analyticsTimeRangeToInterval('30d')).toBe('30 days');
  });

  it('analyticsTimeRangeToLimit maps correctly', async () => {
    const { analyticsTimeRangeToLimit } = await import('./analytics.service');
    expect(analyticsTimeRangeToLimit('24h')).toBe(5);
    expect(analyticsTimeRangeToLimit('7d')).toBe(7);
    expect(analyticsTimeRangeToLimit('30d')).toBe(10);
  });

  it('computeGrowthRatePct', async () => {
    const { computeGrowthRatePct } = await import('./analytics.service');
    expect(computeGrowthRatePct(150, 100)).toBe(50);
    expect(computeGrowthRatePct(100, 0)).toBe(100);
    expect(computeGrowthRatePct(0, 100)).toBe(-100);
  });

  it('computeStorageEfficiencyPct', async () => {
    const { computeStorageEfficiencyPct } = await import('./analytics.service');
    expect(computeStorageEfficiencyPct(50, 100)).toBe(50);
    expect(computeStorageEfficiencyPct(0, 100)).toBe(0);
  });

  it('formatCompactNumber', async () => {
    const { formatCompactNumber } = await import('./analytics.service');
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(1000000)).toBe('1M');
  });

  it('formatFixedNumber', async () => {
    const { formatFixedNumber } = await import('./analytics.service');
    expect(formatFixedNumber(3.14159, 2)).toBe('3.14');
    expect(formatFixedNumber(3, 4)).toBe('3.0000');
  });
});

describe('getAnalyticsDashboardData', () => {
  const defaultParams = { range: '7d' as const, role: 'admin' as const };

  it('returns full dashboard response', async () => {
    mockApiClient.get.mockResolvedValue({
      r2_usage_gb: 1.5,
      r2_allocated_gb: 10,
    });
    mockApiClient.post
      .mockResolvedValueOnce({ mau: 100, dau: 30, new_signups: 5, dau_change: 2, churn_rate_pct: 1 })
      .mockResolvedValueOnce([{ signup_date: '2026-07-01', new_users: 3 }])
      .mockResolvedValueOnce([{ chapter_id: 'ch1', story_id: 's1', read_count: 50, favorite_count: 5 }])
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(10);

    const { getAnalyticsDashboardData } = await import('./analytics.service');
    const result = await getAnalyticsDashboardData(defaultParams);

    expect(result.meta.range).toBe('7d');
    expect(result.meta.restricted).toBe(false);
    expect(result.user_engagement.total_users).toBe(100);
    expect(result.user_engagement.active_users).toBe(30);
    expect(result.content_performance.total_views).toBeGreaterThan(0);
    expect(result.infrastructure.r2_usage_gb).toBe(1.5);
    expect(result.infrastructure.storage_efficiency_pct).toBe(15);
    expect(result.trends.user_growth).toHaveLength(1);
  });

  it('returns degraded health when all RPCs fail', async () => {
    mockApiClient.get.mockRejectedValue(new Error('CF down'));
    mockApiClient.post.mockRejectedValue(new Error('supabase down'));

    const { getAnalyticsDashboardData } = await import('./analytics.service');
    const result = await getAnalyticsDashboardData(defaultParams);

    expect(result.meta.source_health.supabase).toBe('degraded');
    expect(result.meta.source_health.cloudflare).toBe('degraded');
    expect(result.user_engagement.total_users).toBe(0);
    expect(result.content_performance.top_chapters).toEqual([]);
    expect(result.infrastructure.r2_allocated_gb).toBe(0);
  });

  it('restricts data for employee role', async () => {
    mockApiClient.get.mockResolvedValue({ r2_usage_gb: 1 });
    mockApiClient.post.mockResolvedValue([]);

    const { getAnalyticsDashboardData } = await import('./analytics.service');
    const result = await getAnalyticsDashboardData({ ...defaultParams, role: 'employee' });

    expect(result.meta.restricted).toBe(true);
    expect(result.content_performance.top_chapters.length).toBeLessThanOrEqual(3);
    expect(result.infrastructure.r2_allocated_gb).toBe(0);
    expect(result.infrastructure.d1_queries_count).toBe(0);
  });
});