"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";

export type AnalyticsData = {
  r2_usage_gb: number;
  r2_allocated_gb: number;
  r2_object_count: number;
  storage_efficiency_pct: number;
  page_views: number;
  device_mobile: number;
  device_desktop: number;
  device_tablet: number;
  top_zones: Array<{ zone: string; requests: number }>;
  queue_binding: string;
  queue_backlog: number;
  workflow_binding: string;
  kv_binding: string;
  recorded_at: string;
};

export function useAdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AnalyticsData>(ROUTES.API.ANALYTICS_INFRASTRUCTURE, { signal: AbortSignal.timeout(20000) });
      if (res) {
        setData(res);
      }
    } catch (err: any) {
      console.error("Failed to load analytics data", err);
      setError(err?.message || "Failed to fetch analytics data");
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
    error,
    usagePct,
    refresh: fetchAnalytics,
  };
}
