"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type InfraStats = {
  r2_usage_gb: number;
  r2_allocated_gb: number;
  r2_object_count: number;
  r2_egress_gb: number;
  cache_hit_ratio_pct: number;
  page_views: number;
  recorded_at: string;
};

export type ComicSimple = {
  id: string;
  title: string;
  author: string;
  category?: string;
  views?: number;
  status: string;
};

export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalComics, setTotalComics] = useState<number>(0);
  const [totalChapters, setTotalChapters] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [infraStats, setInfraStats] = useState<InfraStats | null>(null);
  const [recentComics, setRecentComics] = useState<ComicSimple[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Comics & Total count
      const comicsRes = await apiClient.get<any>("/api/comics?limit=5").catch(() => null);
      if (comicsRes) {
        setTotalComics(comicsRes.total || (comicsRes.items ? comicsRes.items.length : 0));
        setRecentComics(comicsRes.items || []);
      }

      // 2. Fetch Infrastructure & R2 metrics from Worker
      const infraRes = await apiClient.get<InfraStats>("/api/analytics/infrastructure").catch(() => null);
      if (infraRes) {
        setInfraStats(infraRes);
      }

      // 3. Fetch User & Chapter count directly via Supabase browser client
      const supabase = getSupabaseBrowserClient();
      const [userCountRes, chapterCountRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("chapters").select("id", { count: "exact", head: true }),
      ]).catch(() => [null, null]);

      if (userCountRes && userCountRes.count !== null) {
        setTotalUsers(userCountRes.count);
      }
      if (chapterCountRes && chapterCountRes.count !== null) {
        setTotalChapters(chapterCountRes.count);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    loading,
    totalComics,
    totalChapters,
    totalUsers,
    infraStats,
    recentComics,
    refresh: fetchDashboardData,
  };
}
