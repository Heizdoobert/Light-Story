"use client";

import { useEffect, useState } from 'react';
import { BookOpen, Database, Layers, TrendingUp, Users } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';
import { formatCompactNumber, formatFixedNumber } from '@/services/admin/analytics.service';
import { useRoleGuard } from '@/hooks/common/use-role-guard';

type OverviewStats = {
  totalStories: number;
  totalChapters: number;
  activeStories: number;
  totalViews: number;
};

type EngagementSummary = {
  mau?: number;
  new_signups?: number;
  dau?: number;
};

type InfrastructureMetrics = {
  r2_usage_gb?: number;
  r2_allocated_gb?: number;
  r2_object_count?: number;
};

type OverviewData = {
  stats: OverviewStats | null;
  engagement: EngagementSummary | null;
  infrastructure: InfrastructureMetrics | null;
};

const empty: OverviewData = { stats: null, engagement: null, infrastructure: null };

// ponytail: real server data only — no fake numbers. Three existing endpoints:
// worker /admin/analytics/dashboard (counts), Supabase RPC (users), worker /analytics/infrastructure (R2).
async function fetchOverview(): Promise<OverviewData> {
  const [stats, engagement, infrastructure] = await Promise.all([
    apiClient
      .get<{ stats: OverviewStats }>(ROUTES.API.ADMIN.ANALYTICS_DASHBOARD)
      .then((res) => res?.stats ?? null)
      .catch(() => null),
    apiClient
      .post<EngagementSummary>(ROUTES.API.SUPABASE_RPC('get_user_engagement_summary'), { p_time_range: '30d' })
      .then((res) => res ?? null)
      .catch(() => null),
    apiClient
      .get<InfrastructureMetrics>(ROUTES.API.ANALYTICS_INFRASTRUCTURE)
      .then((res) => res ?? null)
      .catch(() => null),
  ]);
  return { stats, engagement, infrastructure };
}

export default function AdminDashboardPage() {
  useRoleGuard(["superadmin", "admin"], ROUTES.ADMIN.COMICS);
  const [data, setData] = useState<OverviewData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOverview().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
      setError(!result.stats && !result.engagement && !result.infrastructure);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { stats, engagement, infrastructure } = data;
  const r2Usage = infrastructure?.r2_usage_gb ?? 0;
  const r2Allocated = infrastructure?.r2_allocated_gb ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Tổng Quan Quản Trị</h1>
        <p className="text-sm text-slate-500 mt-1">Số liệu thực từ máy chủ — truyện, chương, người dùng và hạ tầng.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải số liệu...</p>}
      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Không thể tải số liệu từ máy chủ. Kiểm tra kết nối gateway và thử lại.
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Tổng Số Truyện"
            value={formatCompactNumber(stats?.totalStories ?? 0)}
            change={stats ? `${formatCompactNumber(stats.activeStories)} đang hoạt động` : undefined}
            icon={BookOpen}
          />
          <StatCard
            title="Tổng Số Chương"
            value={formatCompactNumber(stats?.totalChapters ?? 0)}
            change={stats ? 'chương đã đăng' : undefined}
            icon={Layers}
          />
          <StatCard
            title="Người Dùng Mới (30 ngày)"
            value={formatCompactNumber(engagement?.new_signups ?? 0)}
            change={engagement ? `${formatCompactNumber(engagement.mau ?? 0)} người dùng hoạt động` : undefined}
            icon={Users}
          />
          <StatCard
            title="Lượt Đọc"
            value={formatCompactNumber(stats?.totalViews ?? 0)}
            change={engagement ? `${formatCompactNumber(engagement.dau ?? 0)} người đọc hôm nay` : undefined}
            icon={TrendingUp}
          />
          <StatCard
            title="Dung Lượng R2"
            value={r2Allocated > 0 ? `${formatFixedNumber(r2Usage, 1)} / ${formatFixedNumber(r2Allocated, 1)} GB` : `${formatFixedNumber(r2Usage, 1)} GB`}
            change={infrastructure ? `${formatCompactNumber(infrastructure.r2_object_count ?? 0)} đối tượng` : undefined}
            icon={Database}
          />
        </div>
      )}
    </div>
  );
}
