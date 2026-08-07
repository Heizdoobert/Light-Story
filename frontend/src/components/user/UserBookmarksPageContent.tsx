"use client";

import React from "react";
import { Bookmark, Sparkles } from "lucide-react";
import { useBookmarks } from "@/hooks/features/useBookmarks";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export const UserBookmarksPageContent: React.FC = () => {
  const { bookmarks, isLoading, removeBookmark } = useBookmarks();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bookmark className="text-primary fill-primary/20" size={24} />
            Truyện Theo Dõi ({bookmarks.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách các bộ truyện bạn đã đánh dấu theo dõi để nhận thông báo chương mới.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <Sparkles className="mx-auto text-amber-400 mb-3" size={36} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bạn chưa theo dõi truyện nào</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Hãy khám phá kho truyện phong phú và bấm nút Theo dõi để dễ dàng xem lại tại đây!
          </p>
          <Link
            href={ROUTES.COMICS}
            className="inline-block mt-5 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md hover:bg-primary/90 transition-all"
          >
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {bookmarks.map((comicId) => (
            <div
              key={comicId}
              className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-primary/50 flex flex-col"
            >
              <Link href={`/comics/${comicId}`} className="block relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-800 p-4">
                <div className="flex items-center justify-center h-full">
                  <span className="font-bold text-xs text-slate-600 dark:text-slate-300 text-center line-clamp-3">
                    Truyện ID: {comicId}
                  </span>
                </div>
              </Link>
              <div className="p-3 flex flex-col flex-1 justify-between">
                <Link href={`/comics/${comicId}`}>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    Truyện {comicId.slice(0, 8)}
                  </h3>
                </Link>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Theo dõi</span>
                  <button
                    onClick={() => removeBookmark(comicId)}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Bỏ theo dõi
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
