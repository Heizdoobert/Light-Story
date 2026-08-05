export type AnalyticsTimeRange = '24h' | '7d' | '30d';

export type AnalyticsRole = 'superadmin' | 'admin' | 'employee';

export type AnalyticsSourceHealth = 'ready' | 'degraded' | 'unavailable';

export interface AnalyticsTimeWindow {
  start: string;
  end: string;
  interval: string;
}

export interface AnalyticsMeta {
  timestamp: string;
  range: AnalyticsTimeRange;
  role: AnalyticsRole;
  cached: boolean;
  restricted: boolean;
  source_health: {
    supabase: AnalyticsSourceHealth;
    cloudflare: AnalyticsSourceHealth;
  };
  time_window: AnalyticsTimeWindow;
}

export interface UserEngagementMetrics {
  total_users: number;
  new_users: number;
  active_users: number;
  total_views: number;
  total_favorites: number;
  growth_rate_pct: number;
  churn_rate_pct: number;
  avg_session_duration_minutes: number;
}

export interface TopChapterMetric {
  chapter_id: string;
  story_id: string;
  title: string;
  chapter_number: number;
  views: number;
  favorites: number;
  engagement_score: number;
  growth_rate_pct: number;
}

export interface ContentPerformanceMetrics {
  total_views: number;
  total_favorites: number;
  avg_views_per_chapter: number;
  engagement_score: number;
  top_chapters: TopChapterMetric[];
}

export interface InfrastructureMetrics {
  r2_usage_gb: number;
  r2_allocated_gb: number;
  r2_object_count: number;
  r2_egress_gb: number;
  d1_queries_count: number;
  d1_avg_latency_ms: number;
  page_views: number;
  bandwidth_gb: number;
  cache_hit_ratio_pct: number;
  storage_efficiency_pct: number;
  device_mobile?: number;
  device_desktop?: number;
  device_tablet?: number;
  top_zones?: Array<{ zone: string; requests: number; cache_hit_ratio_pct?: number }>;
}

export interface AnalyticsTrendPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface AnalyticsDashboardResponse {
  meta: AnalyticsMeta;
  user_engagement: UserEngagementMetrics;
  content_performance: ContentPerformanceMetrics;
  infrastructure: InfrastructureMetrics;
  trends: {
    user_growth: AnalyticsTrendPoint[];
    traffic: AnalyticsTrendPoint[];
    storage: AnalyticsTrendPoint[];
  };
}
