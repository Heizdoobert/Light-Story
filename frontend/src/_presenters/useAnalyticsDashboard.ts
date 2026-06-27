"use client";

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDashboardResponse, AnalyticsRole, AnalyticsTimeRange } from '@/types/analytics';
import { getAnalyticsDashboardData } from '@/services/analytics.service';

function createFallbackAnalyticsDashboard(range: AnalyticsTimeRange): AnalyticsDashboardResponse {
  const now = new Date().toISOString();
  return {
    meta: {
      timestamp: now,
      range,
      role: 'employee',
      cached: false,
      restricted: true,
      source_health: { supabase: 'degraded', cloudflare: 'degraded' },
      time_window: { start: now, end: now, interval: '7 days' },
    },
    user_engagement: {
      total_users: 0,
      new_users: 0,
      active_users: 0,
      total_views: 0,
      total_favorites: 0,
      growth_rate_pct: 0,
      churn_rate_pct: 0,
      avg_session_duration_minutes: 0,
    },
    content_performance: {
      total_views: 0,
      total_favorites: 0,
      avg_views_per_chapter: 0,
      engagement_score: 0,
      top_chapters: [],
    },
    infrastructure: {
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
    },
    trends: { user_growth: [], traffic: [], storage: [] },
  };
}

export function useAnalyticsDashboard(range: AnalyticsTimeRange, role: AnalyticsRole | null) {
  return useQuery({
    queryKey: ['analytics-dashboard', range, role],
    queryFn: async () => {
      if (!role) return createFallbackAnalyticsDashboard(range);
      try {
        return await getAnalyticsDashboardData({ range, role });
      } catch {
        return createFallbackAnalyticsDashboard(range);
      }
    },
    enabled: !!role,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
