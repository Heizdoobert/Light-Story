"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsTrendPoint } from '@/types/analytics';

type TrendChartProps = {
  data: AnalyticsTrendPoint[];
  title?: string;
  color?: string;
  height?: number;
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title = 'Trend',
  color = '#3b82f6',
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }

  // Format data for chart - truncate timestamps to date only
  const chartData = data.map(point => ({
    ...point,
    displayDate: new Date(point.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
            title,
          ]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          name={title}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
