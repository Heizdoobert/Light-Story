"use client";

import React from 'react';

export const ComicCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80 flex flex-col h-full">
      <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 w-full" />
      <div className="p-4 space-y-2 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3 mt-2" />
      </div>
    </div>
  );
};
