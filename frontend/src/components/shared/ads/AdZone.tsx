"use client";

import React from "react";

type AdZoneFormat = "banner" | "in-feed" | "rectangle";

type AdZoneProps = {
  zoneId: string;
  format?: AdZoneFormat;
  className?: string;
  label?: string;
};

export const AdZone: React.FC<AdZoneProps> = ({
  zoneId,
  format = "banner",
  className = "",
  label = "Quảng cáo",
}) => {
  return (
    <div
      id={`ad-zone-${zoneId}`}
      data-ad-zone={zoneId}
      className={`my-4 w-full flex flex-col items-center justify-center transition-all ${className}`}
    >
      <div className="w-full max-w-[800px] relative rounded-2xl border border-dashed border-slate-300/80 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 p-3 sm:p-4 text-center overflow-hidden">
        <div className="absolute top-2 right-3 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
          {label}
        </div>

        {format === "banner" && (
          <div className="min-h-[90px] w-full flex flex-col items-center justify-center gap-1.5 py-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vùng Quảng Cáo Leaderboard ({zoneId})
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Hỗ trợ Kích thước Banner 728x90 / Responsive Ads
            </span>
          </div>
        )}

        {format === "in-feed" && (
          <div className="min-h-[120px] w-full flex flex-col items-center justify-center gap-1.5 py-6">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vùng Quảng Cáo Giữa Trang ({zoneId})
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Tối ưu cho In-Feed Ads & Native Sponsor Banners
            </span>
          </div>
        )}

        {format === "rectangle" && (
          <div className="min-h-[250px] w-full max-w-[300px] mx-auto flex flex-col items-center justify-center gap-1.5 py-6">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vùng Quảng Cáo Khối ({zoneId})
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Kích thước 300x250 Medium Rectangle
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
