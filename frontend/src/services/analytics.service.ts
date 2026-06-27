import type {
  AnalyticsDashboardResponse,
  AnalyticsRole,
  AnalyticsTimeRange,
  ContentPerformanceMetrics,
  InfrastructureMetrics,
  UserEngagementMetrics,
} from '@/types/analytics';
import { apiClient } from '@/lib/apiClient';

type WorkerInfrastructurePayload = Partial<InfrastructureMetrics> & {
  recorded_at?: string;
};

type WorkerAnalyticsPayload = {
  infrastructure?: WorkerInfrastructurePayload;
  source_health?: Partial<AnalyticsDashboardResponse['meta']['source_health']>;
};

const DEFAULT_INFRASTRUCTURE: InfrastructureMetrics = {
  r2_usage_gb: 0,
  r2_allocated_gb: 0,
  r2_object_count: 0,
  r2_egress_gb: 0,
  d1_queries_count: 0,
  d1_avg_latency_ms: 0,
  page_views: 0,
  bandwidth_gb: 0,
  cache_hit_ratio_pct: 0,
  storage_efficiency_pct: 0,
  device_mobile: 0,
  device_desktop: 0,
  device_tablet: 0,
  top_zones: [],
};

const TIME_RANGE_TO_INTERVAL: Record<AnalyticsTimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const TIME_RANGE_TO_LIMIT: Record<AnalyticsTimeRange, number> = {
  '24h': 5,
  '7d': 7,
  '30d': 10,
};

const TIME_RANGE_DAYS: Record<AnalyticsTimeRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
};

function computeEngagementScore(views: number, favorites: number): number {
  return round(views * 1.0 + favorites * 5.0);
}

function createEmptyUserEngagement(): UserEngagementMetrics {
  return {
    total_users: 0,
    new_users: 0,
    active_users: 0,
    total_views: 0,
    total_favorites: 0,
    growth_rate_pct: 0,
    churn_rate_pct: 0,
    avg_session_duration_minutes: 0,
  };
}

function createEmptyContentPerformance(): ContentPerformanceMetrics {
  return {
    total_views: 0,
    total_favorites: 0,
    avg_views_per_chapter: 0,
    engagement_score: 0,
    top_chapters: [],
  };
}

export function normalizeAnalyticsTimeRange(value: string | null | undefined): AnalyticsTimeRange {
  if (value === '24h' || value === '7d' || value === '30d') return value;
  return '7d';
}

export function analyticsTimeRangeToInterval(range: AnalyticsTimeRange): string {
  return TIME_RANGE_TO_INTERVAL[range];
}

export function analyticsTimeRangeToLimit(range: AnalyticsTimeRange): number {
  return TIME_RANGE_TO_LIMIT[range];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function computeGrowthRate(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100);
}

function computeEfficiency(usedGb: number, allocatedGb: number): number {
  if (allocatedGb <= 0) return 0;
  return round((usedGb / allocatedGb) * 100);
}

async function fetchWorkerAnalytics(_range: AnalyticsTimeRange, _role: AnalyticsRole): Promise<WorkerAnalyticsPayload | null> {
  try {
    const inf = await apiClient.get<any>('/api/analytics/infrastructure');
    if (!inf) return null;
    return { infrastructure: inf, source_health: { cloudflare: 'ready' } };
  } catch {
    return null;
  }
}

function normalizeInfrastructure(metrics: Partial<InfrastructureMetrics> | null | undefined): InfrastructureMetrics {
  if (!metrics) return { ...DEFAULT_INFRASTRUCTURE };
  const next: InfrastructureMetrics = {
    r2_usage_gb: round(toNumber(metrics.r2_usage_gb)),
    r2_allocated_gb: round(toNumber(metrics.r2_allocated_gb)),
    r2_object_count: Math.max(0, Math.trunc(toNumber(metrics.r2_object_count))),
    r2_egress_gb: round(toNumber(metrics.r2_egress_gb)),
    d1_queries_count: Math.max(0, Math.trunc(toNumber(metrics.d1_queries_count))),
    d1_avg_latency_ms: round(toNumber(metrics.d1_avg_latency_ms)),
    page_views: Math.max(0, Math.trunc(toNumber(metrics.page_views))),
    bandwidth_gb: round(toNumber(metrics.bandwidth_gb)),
    cache_hit_ratio_pct: round(toNumber(metrics.cache_hit_ratio_pct)),
    storage_efficiency_pct: round(toNumber(metrics.storage_efficiency_pct)),
    device_mobile: Math.max(0, Math.trunc(toNumber((metrics as any).device_mobile))),
    device_desktop: Math.max(0, Math.trunc(toNumber((metrics as any).device_desktop))),
    device_tablet: Math.max(0, Math.trunc(toNumber((metrics as any).device_tablet))),
    top_zones: Array.isArray((metrics as any).top_zones) ? ((metrics as any).top_zones as any[]) : [],
  };
  if (next.storage_efficiency_pct === 0 && next.r2_allocated_gb > 0) {
    next.storage_efficiency_pct = computeEfficiency(next.r2_usage_gb, next.r2_allocated_gb);
  }
  return next;
}

async function fetchReadOnlySupabaseMetrics(range: AnalyticsTimeRange): Promise<{
  userEngagement: UserEngagementMetrics;
  contentPerformance: ContentPerformanceMetrics;
  trendData: {
    user_growth: Array<{ timestamp: string; value: number; label: string }>;
    traffic: Array<{ timestamp: string; value: number; label: string }>;
    storage: Array<{ timestamp: string; value: number; label: string }>;
  };
}> {
  const timeRangeStr = range;
  try {
    const [engagementData, signupTrendData, topChaptersData, totalViewsData, totalFavoritesData] = await Promise.all([
      apiClient.post<any>('/api/supabase/rest/v1/rpc/get_user_engagement_summary', { p_days_back: 7 }).catch(() => null),
      apiClient.post<any>('/api/supabase/rest/v1/rpc/get_signup_trend', { p_days_back: 30 }).catch(() => null),
      apiClient.post<any>('/api/supabase/rest/v1/rpc/get_top_chapters_by_reads', { p_limit: 5, p_time_range: timeRangeStr }).catch(() => null),
      apiClient.post<any>('/api/supabase/rest/v1/rpc/get_total_views', { p_time_range: timeRangeStr }).catch(() => null),
      apiClient.post<any>('/api/supabase/rest/v1/rpc/get_total_favorites', {}).catch(() => null),
    ]);

    const totalViews = toNumber(totalViewsData ?? 0);
    const totalFavorites = toNumber(totalFavoritesData ?? 0);

    const userEngagement: UserEngagementMetrics = {
      total_users: toNumber(engagementData?.mau ?? 0),
      new_users: toNumber(engagementData?.new_signups ?? 0),
      active_users: toNumber(engagementData?.dau ?? 0),
      total_views: totalViews,
      total_favorites: totalFavorites,
      growth_rate_pct: toNumber(engagementData?.dau_change ?? 0),
      churn_rate_pct: toNumber(engagementData?.churn_rate_pct ?? 0),
      avg_session_duration_minutes: totalViews > 0 && toNumber(engagementData?.dau ?? 0) > 0 ? round(totalViews / toNumber(engagementData?.dau ?? 0)) : 0,
    };

    const rawChapters = Array.isArray(topChaptersData) ? topChaptersData : [];
    const topChapters = rawChapters.map((ch: any) => ({
      chapter_id: ch.chapter_id || '',
      story_id: ch.story_id || '',
      title: ch.story_title || ch.chapter_title || '',
      chapter_number: toNumber(ch.chapter_number),
      views: toNumber(ch.read_count ?? 0),
      favorites: toNumber(ch.favorite_count ?? 0),
      engagement_score: computeEngagementScore(toNumber(ch.read_count ?? 0), toNumber(ch.favorite_count ?? 0)),
      growth_rate_pct: 0,
    }));

    const chViews = topChapters.reduce((s, c) => s + c.views, 0);
    const chFavs = topChapters.reduce((s, c) => s + c.favorites, 0);

    const contentPerformance: ContentPerformanceMetrics = {
      total_views: chViews > 0 ? chViews : totalViews,
      total_favorites: chFavs > 0 ? chFavs : totalFavorites,
      avg_views_per_chapter: topChapters.length > 0 ? round(chViews / topChapters.length) : 0,
      engagement_score: computeEngagementScore(chViews || totalViews, chFavs || totalFavorites),
      top_chapters: topChapters,
    };

    const trendData = {
      user_growth: (signupTrendData || []).map((row: any) => ({
        timestamp: row.signup_date,
        value: toNumber(row.new_users),
        label: `${toNumber(row.new_users)} signups`,
      })),
      traffic: [],
      storage: [],
    };

    return { userEngagement, contentPerformance, trendData };
  } catch {
    return {
      userEngagement: createEmptyUserEngagement(),
      contentPerformance: createEmptyContentPerformance(),
      trendData: { user_growth: [], traffic: [], storage: [] },
    };
  }
}

function applyRoleRestrictions(
  role: AnalyticsRole,
  userEngagement: UserEngagementMetrics,
  contentPerformance: ContentPerformanceMetrics,
  infrastructure: InfrastructureMetrics,
): {
  userEngagement: UserEngagementMetrics;
  contentPerformance: ContentPerformanceMetrics;
  infrastructure: InfrastructureMetrics;
  restricted: boolean;
} {
  if (role === 'superadmin' || role === 'admin') {
    return { userEngagement, contentPerformance, infrastructure, restricted: false };
  }
  return {
    userEngagement,
    contentPerformance: {
      ...contentPerformance,
      top_chapters: contentPerformance.top_chapters.slice(0, 3),
    },
    infrastructure: {
      ...infrastructure,
      r2_allocated_gb: 0,
      r2_object_count: 0,
      d1_queries_count: 0,
      d1_avg_latency_ms: 0,
    },
    restricted: true,
  };
}

export async function getAnalyticsDashboardData(params: {
  supabase?: unknown;
  range: AnalyticsTimeRange;
  role: AnalyticsRole;
}): Promise<AnalyticsDashboardResponse> {
  const { range, role } = params;
  const now = new Date();
  const workerResult = await fetchWorkerAnalytics(range, role);

  const { userEngagement, contentPerformance, trendData } = await fetchReadOnlySupabaseMetrics(range);
  const infrastructure = normalizeInfrastructure(workerResult?.infrastructure ?? DEFAULT_INFRASTRUCTURE);
  const restricted = applyRoleRestrictions(role, userEngagement, contentPerformance, infrastructure);

  return {
    meta: {
      timestamp: now.toISOString(),
      range,
      role,
      cached: false,
      restricted: restricted.restricted,
      source_health: {
        supabase: userEngagement.total_users > 0 || contentPerformance.top_chapters.length > 0 ? 'ready' : 'degraded',
        cloudflare: workerResult?.infrastructure ? 'ready' : 'degraded',
      },
      time_window: {
        start: new Date(now.getTime() - TIME_RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString(),
        interval: analyticsTimeRangeToInterval(range),
      },
    },
    user_engagement: restricted.userEngagement,
    content_performance: restricted.contentPerformance,
    infrastructure: restricted.infrastructure,
    trends: trendData,
  };
}

export function computeGrowthRatePct(current: number, previous: number): number {
  return computeGrowthRate(current, previous);
}

export function computeStorageEfficiencyPct(usedGb: number, allocatedGb: number): number {
  return computeEfficiency(usedGb, allocatedGb);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatFixedNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
