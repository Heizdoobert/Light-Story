'use client';

import React from 'react';
import { AdRenderer } from '@/components/reader/AdRenderer';
import { Chapter } from '@/types/entities';

interface ReaderPageProps {
  chapter: Chapter | null;
  loading: boolean;
  error: string | null;
  fontSize: number;
  theme: string;
  onDecrementFontSize: () => void;
  onIncrementFontSize: () => void;
  onThemeChange: (theme: string) => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({
  chapter,
  loading,
  error,
  fontSize,
  theme,
  onDecrementFontSize,
  onIncrementFontSize,
  onThemeChange,
}) => {
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-slate-950 text-slate-100';
      case 'sepia':
        return 'bg-[#f4ecd8] text-[#5b4636]';
      default:
        return 'bg-slate-50 text-slate-900';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  if (!chapter) return <div className="flex items-center justify-center h-screen">Chapter not found</div>;

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${getThemeClasses()}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-white/10">
          <div className="flex gap-4">
            <button onClick={onDecrementFontSize} className="px-3 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 font-bold transition-colors">
              A-
            </button>
            <button onClick={onIncrementFontSize} className="px-3 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 font-bold transition-colors">
              A+
            </button>
          </div>
          <div className="flex gap-2">
            {['light', 'sepia', 'dark'].map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${theme === t ? 'bg-primary text-white scale-105 shadow-sm' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <AdRenderer position="header" />
        <h1 className="text-3xl font-bold">{chapter.title}</h1>
        <div className="mt-4 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
          {chapter.content}
        </div>
        <AdRenderer position="middle" />
      </div>
    </div>
  );
};
