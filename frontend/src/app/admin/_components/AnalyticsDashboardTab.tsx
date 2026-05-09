"use client";

import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, CalendarRange, Cloud, Loader2, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { useAnalyticsDashboard } from '@/_presenters/useAnalyticsDashboard';
import { TrendsSection } from './TrendsSection';
import type { AnalyticsRole, AnalyticsTimeRange, ContentPerformanceMetrics, InfrastructureMetrics, UserEngagementMetrics } from '@/types/analytics';
import { computeStorageEfficiencyPct, formatCompactNumber, formatFixedNumber } from '@/services/analytics.service';

type AnalyticsDashboardTabProps = {
  role: AnalyticsRole | null;
  userId: string | null;
};

const TIME_RANGES: Array<{ value: AnalyticsTimeRange; label: string }> = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function MetricCard({
  title,
  value,
  detail,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/80 p-3 sm:p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400 dark:text-slate-500 truncate">{title}</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white break-words">{value}</div>
        </div>
        <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl ${accent} shadow-lg flex-shrink-0`} />
      </div>
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-2">{detail}</p>
    </div>
  );
}

function SectionShell({
  title,
  description,
  icon,
  tone = 'neutral',
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'supabase' | 'cloudflare';
  children: React.ReactNode;
}) {
  const toneClasses = {
    neutral: 'bg-slate-950 text-white dark:bg-slate-900',
    supabase: 'bg-gradient-to-br from-emerald-600 to-teal-500 text-white',
    cloudflare: 'bg-gradient-to-br from-orange-500 to-amber-400 text-white',
  } as const;

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.10)] overflow-hidden">
      <header className="flex items-start gap-4 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
        <div className={`rounded-2xl p-3 ${toneClasses[tone]}`}>{icon}</div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function UserEngagementCard({ data }: { data: UserEngagementMetrics }) {
  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="Total Users" value={formatCompactNumber(data.total_users)} detail="All registered profiles" accent="bg-gradient-to-br from-blue-500 to-cyan-400" />
        <MetricCard title="New Sign-ups" value={formatCompactNumber(data.new_users)} detail={`Growth rate ${formatFixedNumber(data.growth_rate_pct)}%`} accent="bg-gradient-to-br from-emerald-500 to-lime-400" />
        <MetricCard title="Active Users" value={formatCompactNumber(data.active_users)} detail="Users with recent reading activity" accent="bg-gradient-to-br from-violet-500 to-fuchsia-400" />
        <MetricCard title="Favorites" value={formatCompactNumber(data.total_favorites)} detail="Stories saved or liked by users" accent="bg-gradient-to-br from-amber-500 to-orange-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Churn Rate</p>
          <div className="mt-2 sm:mt-3 flex items-end gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatFixedNumber(data.churn_rate_pct)}%</span>
            <ArrowUpRight className="text-emerald-500 mb-0.5 sm:mb-1 flex-shrink-0" size={16} />
          </div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Lower values indicate stronger retention for the selected time range.</p>
        </div>
        <div className="rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Views</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatCompactNumber(data.total_views)}</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Reading activity across all tracked stories.</p>
        </div>
        <div className="rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Avg. Session</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatFixedNumber(data.avg_session_duration_minutes)}m</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Estimated from user view windows in the selected period.</p>
        </div>
      </div>
    </div>
  );
}

function ContentPerformanceCard({ data }: { data: ContentPerformanceMetrics }) {
  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <MetricCard title="Total Views" value={formatCompactNumber(data.total_views)} detail="Chapter-level engagement volume" accent="bg-gradient-to-br from-indigo-500 to-blue-400" />
        <MetricCard title="Favorites" value={formatCompactNumber(data.total_favorites)} detail="User favorites tied to story content" accent="bg-gradient-to-br from-pink-500 to-rose-400" />
        <MetricCard title="Engagement Score" value={formatFixedNumber(data.engagement_score)} detail="Normalized content interaction score" accent="bg-gradient-to-br from-cyan-500 to-sky-400" />
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-full inline-grid grid-cols-[2fr,0.7fr,0.7fr,0.8fr] gap-4 px-3 sm:px-5 py-3 sm:py-4 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.28em] text-slate-400 border-b border-slate-200/70 dark:border-slate-800">
            <div>Chapter</div>
            <div>Views</div>
            <div>Favorites</div>
            <div>Growth</div>
          </div>
        </div>
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-96 overflow-y-auto">
          {data.top_chapters.map((chapter) => (
            <div key={chapter.chapter_id} className="overflow-x-auto">
              <div className="inline-grid grid-cols-[2fr,0.7fr,0.7fr,0.8fr] gap-4 px-3 sm:px-5 py-3 sm:py-4 items-center min-w-full">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950 dark:text-white text-xs sm:text-sm truncate">{chapter.title}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Ch {chapter.chapter_number}</p>
                </div>
                <div className="font-black text-slate-700 dark:text-slate-200 text-xs sm:text-sm">{formatCompactNumber(chapter.views)}</div>
                <div className="font-black text-slate-700 dark:text-slate-200 text-xs sm:text-sm">{formatCompactNumber(chapter.favorites)}</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">{formatFixedNumber(chapter.growth_rate_pct)}%</div>
              </div>
            </div>
          ))}
          {data.top_chapters.length === 0 && (
            <div className="px-3 sm:px-5 py-6 sm:py-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400">No chapter data available for the selected range.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfrastructureCard({ data }: { data: InfrastructureMetrics }) {
  const storageEfficiency = data.storage_efficiency_pct || computeStorageEfficiencyPct(data.r2_usage_gb, data.r2_allocated_gb);

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <MetricCard title="R2 Usage" value={`${formatFixedNumber(data.r2_usage_gb)} GB`} detail={`Allocated ${formatFixedNumber(data.r2_allocated_gb)} GB`} accent="bg-gradient-to-br from-slate-700 to-slate-500" />
        <MetricCard title="R2 Objects" value={formatCompactNumber(data.r2_object_count)} detail="Media objects stored in R2" accent="bg-gradient-to-br from-teal-500 to-emerald-400" />
        <MetricCard title="Page Views" value={formatCompactNumber(data.page_views)} detail="Cloudflare analytics traffic volume" accent="bg-gradient-to-br from-amber-500 to-yellow-400" />
        <MetricCard title="Cache Hit Ratio" value={`${formatFixedNumber(data.cache_hit_ratio_pct)}%`} detail="Cloudflare cache effectiveness" accent="bg-gradient-to-br from-fuchsia-500 to-pink-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Storage Efficiency</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatFixedNumber(storageEfficiency)}%</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Used over allocated capacity for R2 media storage.</p>
        </div>
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">D1 Query Count</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatCompactNumber(data.d1_queries_count)}</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Aggregate database activity in the selected range.</p>
        </div>
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">D1 Latency</p>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{formatFixedNumber(data.d1_avg_latency_ms)} ms</div>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Average query latency for backend reads and writes.</p>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:p-5">
        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Cloudflare Device Breakdown</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Mobile</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200">{formatCompactNumber(data.device_mobile || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Desktop</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200">{formatCompactNumber(data.device_desktop || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Tablet</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200">{formatCompactNumber(data.device_tablet || 0)}</p>
          </div>
        </div>
      </div>

      {data.top_zones && data.top_zones.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:p-5">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-400">Cloudflare Top Zones</p>
          <div className="mt-3 space-y-2 sm:space-y-3 max-h-72 overflow-y-auto">
            {data.top_zones.slice(0, 5).map((zone) => (
              <div key={zone.zone} className="flex items-center justify-between gap-3 pb-2 sm:pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white text-xs sm:text-sm truncate">{zone.zone}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Cache hit {formatFixedNumber(zone.cache_hit_ratio_pct || 0)}%</p>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 flex-shrink-0">{formatCompactNumber(zone.requests)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const AnalyticsDashboardTab: React.FC<AnalyticsDashboardTabProps> = ({ role, userId }) => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('7d');
  const dashboardQuery = useAnalyticsDashboard(timeRange);

  const isAdmin = role === 'superadmin' || role === 'admin';
  const limitedView = role === 'employee';

  return (
    <div className="space-y-4 sm:space-y-8">
      <header className="relative overflow-hidden rounded-xl sm:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.96))] px-3 sm:px-6 py-4 sm:py-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle,_rgba(56,189,248,0.22),_transparent_70%)]" />
        <div className="relative flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.32em] text-slate-200">
              <Sparkles size={12} className="flex-shrink-0" /> Analytics Overview
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight break-words">Operational dashboard for readership, content, and infrastructure.</h1>
              <p className="mt-1 sm:mt-2 max-w-3xl text-xs sm:text-sm leading-5 sm:leading-6 text-slate-300">
                Unifies Supabase engagement data with Cloudflare metrics so the team can monitor growth, favorites, storage, and delivery health in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <div className="rounded-lg sm:rounded-2xl border border-white/10 bg-white/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm backdrop-blur-sm">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-300">Current Role</p>
              <p className="mt-0.5 sm:mt-1 font-semibold text-white text-sm sm:text-base">{role ?? 'guest'}{limitedView ? ' · limited view' : ''}</p>
            </div>
            <div className="rounded-lg sm:rounded-2xl border border-white/10 bg-white/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm backdrop-blur-sm">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-300">User ID</p>
              <p className="mt-0.5 sm:mt-1 font-mono text-[10px] sm:text-xs text-slate-200 truncate">{userId ?? 'anonymous'}</p>
            </div>
            <button
              type="button"
              onClick={() => void dashboardQuery.refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-2xl bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw size={14} className={dashboardQuery.isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center rounded-lg sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 p-2 sm:p-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap gap-1.5 sm:gap-3">
          {TIME_RANGES.map((item) => {
            const active = timeRange === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTimeRange(item.value)}
                className={`inline-flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-colors ${
                  active
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarRange size={13} className="flex-shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.replace('Last ', '').replace(' days', 'd')}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto inline-flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Cloud size={13} className="flex-shrink-0" />
          <span className="hidden sm:inline">{dashboardQuery.data?.meta.cached ? 'Cached snapshot' : 'Fresh aggregation'}</span>
          <span className="sm:hidden">{dashboardQuery.data?.meta.cached ? 'Cached' : 'Fresh'}</span>
        </div>
      </div>

      {dashboardQuery.isLoading && (
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="animate-spin" size={18} /> Loading analytics data...
        </div>
      )}

      {dashboardQuery.isError && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5" />
          <div>
            <p className="font-bold">Unable to load analytics dashboard.</p>
            <p className="mt-1 text-sm">{dashboardQuery.error instanceof Error ? dashboardQuery.error.message : 'Unknown analytics error'}</p>
          </div>
        </div>
      )}

      {dashboardQuery.data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:gap-6">
            <SectionShell tone="supabase" title="Supabase Engagement" description="Supabase-derived readership and retention signals." icon={<ShieldCheck size={16} className="sm:size-18" />}>
              <UserEngagementCard data={dashboardQuery.data.user_engagement} />
            </SectionShell>

            <SectionShell tone="supabase" title="Supabase Content Performance" description="Chapter rankings and reading momentum from Supabase." icon={<TrendingUp size={16} className="sm:size-18" />}>
              <ContentPerformanceCard data={dashboardQuery.data.content_performance} />
            </SectionShell>

            <SectionShell tone="cloudflare" title="Cloudflare Infrastructure" description={isAdmin ? 'Cloudflare delivery, caching, device, and zone telemetry.' : 'Restricted view of public delivery health.'} icon={<Cloud size={16} className="sm:size-18" />}>
              <InfrastructureCard data={dashboardQuery.data.infrastructure} />
            </SectionShell>

            <TrendsSection
              userGrowth={dashboardQuery.data.trends.user_growth}
              traffic={dashboardQuery.data.trends.traffic}
              storage={dashboardQuery.data.trends.storage}
              infrastructure={dashboardQuery.data.infrastructure}
              isLoading={dashboardQuery.isLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            <MetricCard
              title="Supabase + Cloudflare Health"
              value={dashboardQuery.data.meta.source_health.cloudflare === 'ready' ? 'Healthy' : dashboardQuery.data.meta.source_health.cloudflare === 'degraded' ? 'Partial' : 'Offline'}
              detail={`Supabase ${dashboardQuery.data.meta.source_health.supabase}, Cloudflare ${dashboardQuery.data.meta.source_health.cloudflare}`}
              accent="bg-gradient-to-br from-emerald-500 to-teal-400"
            />
            <MetricCard
              title="Selected Window"
              value={dashboardQuery.data.meta.range.toUpperCase()}
              detail={`${dashboardQuery.data.meta.time_window.start} → ${dashboardQuery.data.meta.time_window.end}`}
              accent="bg-gradient-to-br from-slate-700 to-slate-500"
            />
            <MetricCard
              title="Restricted View"
              value={dashboardQuery.data.meta.restricted ? 'Yes' : 'No'}
              detail={dashboardQuery.data.meta.restricted ? 'Employee-safe summary only' : 'Full administrative telemetry'}
              accent="bg-gradient-to-br from-fuchsia-500 to-purple-400"
            />
          </div>
        </>
      )}
    </div>
  );
};
