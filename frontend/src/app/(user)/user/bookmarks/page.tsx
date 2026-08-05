"use client";

import { useEffect, useState } from "react";
import { ComicList } from "@/components/comic/comic-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComicCardProps } from "@/components/comic/comic-card";

export default function UserBookmarksPage() {
  const [bookmarks, setBookmarks] = useState<ComicCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock user bookmarks
    const fetchBookmarks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        //API endpoint real
        const res = await fetch("/api/user/bookmarks");
        if (!res.ok) throw new Error("Cannot loadding the data");
        const data: ComicCardProps[] = await res.json();
        setBookmarks(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Having problem");
        setBookmarks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Truyện Theo Dõi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Danh sách các truyện bạn đã bấm yêu thích để nhận thông báo chương
          mới.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-lg font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Thử lại
          </button>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Bạn chưa theo dõi truyện nào.
          </p>
        </div>
      ) : (
        <ComicList comics={bookmarks} />
      )}
    </div>
  );
}
