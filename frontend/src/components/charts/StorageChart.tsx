"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type StorageChartData = {
  name: string;
  value: number;
  percentage?: number;
};

type StorageChartProps = {
  data: StorageChartData[];
  height?: number;
  barColor?: string;
};

export const StorageChart: React.FC<StorageChartProps> = ({
  data,
  height = 320,
  barColor = '#f59e0b',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">No storage data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
        <XAxis
          dataKey="name"
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
            typeof value === 'number' ? `${value.toLocaleString()} GB` : String(value),
            'Storage',
          ]}
          labelFormatter={(label) => `${label}`}
        />
        <Bar
          dataKey="value"
          fill={barColor}
          radius={[8, 8, 0, 0]}
          isAnimationActive={true}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
