"use client";

import type { ElementType } from 'react';
import { Card } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: ElementType;
}

export function StatCard({ title, value, change, isPositive = true, icon: Icon }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between p-6">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{value}</p>
        {change && (
          <p className={`text-xs font-bold mt-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {change}
          </p>
        )}
      </div>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
          <Icon size={24} />
        </div>
      )}
    </Card>
  );
}

export default StatCard;
