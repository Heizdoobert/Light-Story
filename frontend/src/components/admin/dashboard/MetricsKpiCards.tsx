"use client";

import { BookOpen, Layers, Users, TrendingUp } from "lucide-react";
import { formatCompactNumber } from "@/services/admin/analytics.service";
import type { OverviewStats, EngagementSummary } from "@/hooks/presenters/useAdminDashboardPresenter";

interface MetricsKpiCardsProps {
  stats: OverviewStats | null;
  engagement: EngagementSummary | null;
  t: (key: string, fallback?: string) => string;
}

function Sparkline({ points, strokeColor }: { points: number[]; strokeColor: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 60;
  const height = 20;

  const path = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricsKpiCards({ stats, engagement, t }: MetricsKpiCardsProps) {
  const cards = [
    {
      label: t("dash_total_stories"),
      value: formatCompactNumber(stats?.totalStories ?? 0),
      sub: `${formatCompactNumber(stats?.activeStories ?? 0)} ${t("dash_active_stories")}`,
      icon: BookOpen,
      accent: "text-orange-500",
      sparkColor: "#f97316",
      points: [12, 15, 18, 14, 22, 28, 35],
    },
    {
      label: t("dash_total_chapters"),
      value: formatCompactNumber(stats?.totalChapters ?? 0),
      sub: t("dash_chapters_posted"),
      icon: Layers,
      accent: "text-cyan-500",
      sparkColor: "#06b6d4",
      points: [30, 42, 50, 48, 65, 80, 95],
    },
    {
      label: t("dash_new_users_30d"),
      value: formatCompactNumber(engagement?.new_signups ?? 0),
      sub: `${formatCompactNumber(engagement?.mau ?? 0)} ${t("dash_mau")}`,
      icon: Users,
      accent: "text-emerald-500",
      sparkColor: "#10b981",
      points: [5, 12, 19, 25, 22, 38, 45],
    },
    {
      label: t("dash_total_views"),
      value: formatCompactNumber(stats?.totalViews ?? 0),
      sub: `${formatCompactNumber(engagement?.dau ?? 0)} ${t("dash_dau")}`,
      icon: TrendingUp,
      accent: "text-purple-500",
      sparkColor: "#a855f7",
      points: [100, 150, 220, 190, 280, 340, 450],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {c.label}
              </span>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                <Icon size={18} className={c.accent} />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{c.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>
              </div>
              <div className="pb-1">
                <Sparkline points={c.points} strokeColor={c.sparkColor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
