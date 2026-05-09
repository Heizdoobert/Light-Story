"use client";

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ChartContainer, TrendChart, TrafficChart, DeviceDistributionChart } from '@/components/charts';
import type { AnalyticsTrendPoint, InfrastructureMetrics } from '@/types/analytics';

type TrendsSectionProps = {
  userGrowth: AnalyticsTrendPoint[];
  traffic: AnalyticsTrendPoint[];
  storage: AnalyticsTrendPoint[];
  infrastructure: InfrastructureMetrics;
  isLoading?: boolean;
};

export const TrendsSection: React.FC<TrendsSectionProps> = ({
  userGrowth,
  traffic,
  storage,
  infrastructure,
  isLoading = false,
}) => {
  // Prepare device distribution data
  const deviceData = [
    { name: 'Mobile', value: infrastructure.device_mobile || 0 },
    { name: 'Desktop', value: infrastructure.device_desktop || 0 },
    { name: 'Tablet', value: infrastructure.device_tablet || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.32em] text-slate-200">
          <TrendingUp size={12} className="flex-shrink-0" /> Trends & Insights
        </div>
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-2">
        {/* User Growth Trend */}
        <ChartContainer
          title="User Growth"
          description="New signups over the selected period"
          isLoading={isLoading}
        >
          <TrendChart
            data={userGrowth}
            title="New Users"
            color="#10b981"
            height={240}
          />
        </ChartContainer>

        {/* Traffic Trend */}
        <ChartContainer
          title="Page Views & Traffic"
          description="Request volume and bandwidth consumption"
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
          title="Storage Trends"
          description="R2 storage usage trend over time"
          isLoading={isLoading}
        >
          <TrafficChart
            data={storage}
            height={240}
            fillColor="#f59e0b"
            strokeColor="#d97706"
          />
        </ChartContainer>

        {/* Device Distribution */}
        <ChartContainer
          title="Device Distribution"
          description="Requests breakdown by device type"
          isLoading={isLoading}
        >
          {deviceData.length > 0 ? (
            <DeviceDistributionChart
              data={deviceData}
              height={240}
            />
          ) : (
            <div className="flex items-center justify-center h-60 sm:h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs sm:text-sm text-slate-500">No device data available</p>
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Top Zones */}
      {infrastructure.top_zones && infrastructure.top_zones.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-6">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">Top Geographic Zones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400">Zone</th>
                  <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-400">Requests</th>
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
