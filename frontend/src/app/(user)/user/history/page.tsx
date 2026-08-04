"use client";

import { useEffect, useState } from "react";
import { ComicList } from "@/components/comic/comic-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComicCardProps } from "@/components/comic/comic-card";

export default function UserHistoryPage() {
  const [history, setHistory] = useState<ComicCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock user history
    setHistory([
      { id: "1", title: "Võ Luyện Đỉnh Phong", latestChapter: 320 },
      { id: "2", title: "Đấu La Đại Lục", latestChapter: 150 },
    ]);
    setIsLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Lịch Sử Đọc Truyện
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Danh sách các bộ truyện bạn đã từng xem qua gần đây.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <ComicList comics={history} />
      )}
    </div>
  );
}
