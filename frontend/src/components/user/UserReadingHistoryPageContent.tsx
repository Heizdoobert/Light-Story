"use client";

import React from "react";
import { History, Trash2 } from "lucide-react";
import { useReadingHistory } from "@/hooks/features/useReadingHistory";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export const UserReadingHistoryPageContent: React.FC = () => {
  const { history, isLoading, clearHistory } = useReadingHistory();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="text-primary" size={24} />
            Lịch Sử Đọc Truyện ({history.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách các chương truyện bạn vừa đọc gần đây.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 text-xs font-bold transition-all"
          >
            <Trash2 size={14} /> Xóa lịch sử
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <History className="mx-auto text-slate-400 mb-3" size={36} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lịch sử đọc trống</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Các chương truyện bạn xem qua sẽ được lưu lại tự động tại đây để tiện theo dõi.
          </p>
          <Link
            href="/comics"
            className="inline-block mt-5 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md hover:bg-primary/90 transition-all"
          >
            Đọc ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={`${item.comicId}-${item.chapterId}`}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <Link href={`/comics/${item.comicId}`}>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate hover:text-primary transition-colors">
                      Truyện {item.comicId.slice(0, 8)}
                    </h3>
                  </Link>
                  <p className="text-xs font-semibold text-primary mt-1">
                    Chương {item.chapterNumber}
                  </p>
                </div>
              </div>

              <Link
                href={`/comics/${item.comicId}/chapter/${item.chapterId}`}
                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all flex-shrink-0"
              >
                Đọc tiếp
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
