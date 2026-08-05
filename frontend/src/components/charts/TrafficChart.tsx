"use client";

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsTrendPoint } from '@/types/analytics';

type TrafficChartProps = {
  data: AnalyticsTrendPoint[];
  height?: number;
  fillColor?: string;
  strokeColor?: string;
};

export const TrafficChart: React.FC<TrafficChartProps> = ({
  data,
  height = 320,
  fillColor = '#10b981',
  strokeColor = '#059669',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">No traffic data available</p>
      </div>
    );
  }

  const chartData = data.map(point => ({
    ...point,
    displayDate: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
        <XAxis
          dataKey="displayDate"
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
          formatter={(value) => [
            typeof value === 'number' ? value.toLocaleString() : String(value),
            'Traffic',
          ]}
          labelFormatter={(label) => `${label}`}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          fill="url(#trafficGradient)"
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
