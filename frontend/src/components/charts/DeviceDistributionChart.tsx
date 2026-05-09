"use client";

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DeviceData = {
  name: string;
  value: number;
};

type DeviceDistributionChartProps = {
  data: DeviceData[];
  height?: number;
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899'];

export const DeviceDistributionChart: React.FC<DeviceDistributionChartProps> = ({
  data,
  height = 320,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-sm text-slate-500">No device data available</p>
      </div>
    );
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => {
            const percent = ((value / totalValue) * 100).toFixed(0);
            return `${name}: ${percent}%`;
          }}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          isAnimationActive={true}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
          formatter={(value) => {
            if (typeof value === 'number') {
              const percent = ((value / totalValue) * 100).toFixed(1);
              return [`${value.toLocaleString()} (${percent}%)`, 'Requests'];
            }
            return [String(value), 'Requests'];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
