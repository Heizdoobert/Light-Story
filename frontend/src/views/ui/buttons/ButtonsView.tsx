"use client";

import type { FC } from 'react';
import { CoreCard } from '@core/components/Card';
import { Sparkles, Check } from 'lucide-react';

export const ButtonsView: FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Thành Phần Button UI</h1>
      <CoreCard title="Bộ Nút Tương Tác" subtitle="Các kiểu thiết kế nút bấm phổ biến trong hệ thống">
        <div className="flex flex-wrap gap-4 items-center">
          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/30">
            Primary Solid
          </button>
          <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl text-sm shadow-md flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Gradient Magic</span>
          </button>
          <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-md flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Success State</span>
          </button>
          <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700">
            Secondary Border
          </button>
        </div>
      </CoreCard>
    </div>
  );
};

export default ButtonsView;
