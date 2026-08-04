"use client";

import { useEffect, useState } from "react";
import { ComicList } from "@/components/comic/comic-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComicCardProps } from "@/components/comic/comic-card";

export default function UserBookmarksPage() {
  const [bookmarks, setBookmarks] = useState<ComicCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock user bookmarks
    setBookmarks([
      { id: "1", title: "Võ Luyện Đỉnh Phong", latestChapter: 3500 },
      { id: "3", title: "Toàn Trí Độc Giả", latestChapter: 180 },
    ]);
    setIsLoading(false);
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
      ) : (
        <ComicList comics={bookmarks} />
      )}
    </div>
  );
}
