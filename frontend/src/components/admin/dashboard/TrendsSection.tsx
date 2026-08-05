"use client";

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ChartContainer, TrendChart, TrafficChart, DeviceDistributionChart } from '@/components/charts';
import type { AnalyticsTrendPoint, InfrastructureMetrics } from '@/types/analytics';
import { useLanguage } from '@/context/LanguageContext';

type TrendsSectionProps = {
  userGrowth: AnalyticsTrendPoint[];
  traffic: AnalyticsTrendPoint[];
  storage: AnalyticsTrendPoint[];
  queueThroughput?: AnalyticsTrendPoint[];
  workflowExecution?: AnalyticsTrendPoint[];
  infrastructure: InfrastructureMetrics;
  isLoading?: boolean;
};

export const TrendsSection: React.FC<TrendsSectionProps> = ({
  userGrowth,
  traffic,
  storage,
  queueThroughput = [],
  workflowExecution = [],
  infrastructure,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  // Prepare device distribution data
  const deviceData = [
    { name: t("mobile_device"), value: infrastructure.device_mobile || 0 },
    { name: t("desktop_device"), value: infrastructure.device_desktop || 0 },
    { name: t("tablet_device"), value: infrastructure.device_tablet || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.32em] text-slate-200">
          <TrendingUp size={12} className="flex-shrink-0" /> {t("trends_insights")}
        </div>
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-2">
        {/* User Growth Trend */}
        <ChartContainer
          title={t("user_growth_trend")}
          description={t("user_growth_trend_desc")}
          isLoading={isLoading}
        >
          <TrendChart
            data={userGrowth}
            title={t("new_users_chart")}
            color="#10b981"
            height={240}
          />
        </ChartContainer>

        {/* Traffic Trend */}
        <ChartContainer
          title={t("page_views_traffic")}
          description={t("page_views_traffic_desc")}
          isLoading={isLoading}
        >
          <TrafficChart
            data={traffic}
            height={240}
            fillColor="#3b82f6"
            strokeColor="#1e40af"
          />
        </ChartContainer>

        {/* Storage Usage */}
        <ChartContainer
          title={t("storage_trends")}
          description={t("storage_trends_desc")}
          isLoading={isLoading}
        >
          <TrafficChart
            data={storage}
            height={240}
            fillColor="#f59e0b"
            strokeColor="#d97706"
          />
        </ChartContainer>

        {/* Cloudflare Queue Throughput */}
        <ChartContainer
          title="Cloudflare Queue Throughput"
          description="LIGHTSTORY_QUEUE message processing velocity & backlog"
          isLoading={isLoading}
        >
          <TrafficChart
            data={queueThroughput}
            height={240}
            fillColor="#8b5cf6"
            strokeColor="#6d28d9"
          />
        </ChartContainer>

        {/* Cloudflare Workflows Execution */}
        <ChartContainer
          title="Cloudflare Workflows Execution"
          description="LIGHTSTORY_WORKFLOW durable execution runs & latency"
          isLoading={isLoading}
        >
          <TrafficChart
            data={workflowExecution}
            height={240}
            fillColor="#ec4899"
            strokeColor="#be185d"
          />
        </ChartContainer>

        {/* Device Distribution */}
        <ChartContainer
          title={t("device_distribution")}
          description={t("device_distribution_desc")}
          isLoading={isLoading}
        >
          {deviceData.length > 0 ? (
            <DeviceDistributionChart
              data={deviceData}
              height={240}
            />
          ) : (
            <div className="flex items-center justify-center h-60 sm:h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs sm:text-sm text-slate-500">{t("no_device_data")}</p>
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Top Zones */}
      {infrastructure.top_zones && infrastructure.top_zones.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-6">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">{t("top_geographic_zones")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400">{t("zone")}</th>
                  <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400">{t("requests_label")}</th>
                </tr>
              </thead>
              <tbody>
                {infrastructure.top_zones.map((zone, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="py-3 px-4 text-slate-950 dark:text-white">{zone.zone}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-950 dark:text-white">
                      {zone.requests.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
