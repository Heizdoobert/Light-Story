"use client";

import { BookOpen, Layers, Users, TrendingUp } from "lucide-react";
import { MetricCard } from "@light-story/ui";
import { formatCompactNumber } from "@/services/admin/analytics.service";
import type { OverviewStats, EngagementSummary } from "@/hooks/presenters/useAdminDashboardPresenter";

interface MetricsKpiCardsProps {
  stats: OverviewStats | null;
  engagement: EngagementSummary | null;
  t: (key: string, fallback?: string) => string;
  loading?: boolean;
}

export function MetricsKpiCards({ stats, engagement, t, loading = false }: MetricsKpiCardsProps) {
  const cards = [
    {
      label: t("dash_total_stories"),
      value: formatCompactNumber(stats?.totalStories ?? 0),
      sub: `${formatCompactNumber(stats?.activeStories ?? 0)} ${t("dash_active_stories")}`,
      icon: <BookOpen size={20} className="text-orange-500" />,
    },
    {
      label: t("dash_total_chapters"),
      value: formatCompactNumber(stats?.totalChapters ?? 0),
      sub: t("dash_chapters_posted"),
      icon: <Layers size={20} className="text-cyan-500" />,
    },
    {
      label: t("dash_new_users_30d"),
      value: formatCompactNumber(engagement?.new_signups ?? 0),
      sub: `${formatCompactNumber(engagement?.mau ?? 0)} ${t("dash_mau")}`,
      icon: <Users size={20} className="text-emerald-500" />,
    },
    {
      label: t("dash_total_views"),
      value: formatCompactNumber(stats?.totalViews ?? 0),
      sub: `${formatCompactNumber(engagement?.dau ?? 0)} ${t("dash_dau")}`,
      icon: <TrendingUp size={20} className="text-purple-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c) => (
        <MetricCard
          key={c.label}
          title={c.label}
          value={c.value}
          description={c.sub}
          icon={c.icon}
          loading={loading}
          className="shadow-md rounded-2xl border-slate-200 dark:border-slate-800"
        />
      ))}
    </div>
  );
}
