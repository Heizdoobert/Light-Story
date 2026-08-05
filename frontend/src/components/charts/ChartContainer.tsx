"use client";

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

type ChartContainerProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
};

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  isLoading = false,
  error = null,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 animate-spin text-slate-400" size={32} />
            <p className="text-sm text-slate-500">Loading chart data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="w-full overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
};
