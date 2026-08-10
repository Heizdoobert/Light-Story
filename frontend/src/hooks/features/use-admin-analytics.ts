"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";

export type AnalyticsData = {
  r2_usage_gb: number;
  r2_allocated_gb: number;
  r2_object_count: number;
  storage_efficiency_pct: number;
  page_views: number;
  cache_hit_ratio_pct: number;
  device_mobile: number;
  device_desktop: number;
  device_tablet: number;
  top_zones: Array<{ zone: string; requests: number; cache_hit_ratio_pct: number }>;
  queue_binding: string;
  queue_backlog: number;
  workflow_binding: string;
  kv_binding: string;
  recorded_at: string;
};

export function useAdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AnalyticsData>("/api/analytics/infrastructure").catch(() => null);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const usagePct = data ? Math.min(100, Math.round((data.r2_usage_gb / data.r2_allocated_gb) * 100)) : 0;

  return {
    loading,
    data,
    usagePct,
    refresh: fetchAnalytics,
  };
}
