"use client";

export interface ReadingProgressProps {
  progressPct: number;
}

export function ReadingProgress({ progressPct }: ReadingProgressProps) {
  const pct = Math.min(100, Math.max(0, progressPct));
  return (
    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
      <div
        className="bg-orange-500 dark:bg-[#001eff] h-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default ReadingProgress;
