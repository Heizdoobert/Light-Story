"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReadingProgress } from "@/components/user/reading-progress";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/hooks/use-user";
import { ROUTES } from "@/lib/constants/routes";

interface RecommendedItem {
  id: string;
  title: string;
  latestChapter?: number;
}

interface ReadingItem {
  id: string;
  title: string;
  currentChapter: number;
  totalChapters: number;
  progressPct: number;
}

export default function UserDashboardPage() {
  const { user } = useUser();
  const [readingList, setReadingList] = useState<ReadingItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setReadingList([
      {
        id: "1",
        title: "Võ Luyện Đỉnh Phong",
        currentChapter: 320,
        totalChapters: 3500,
        progressPct: 40,
      },
      {
        id: "2",
        title: "Đấu La Đại Lục",
        currentChapter: 150,
        totalChapters: 420,
        progressPct: 75,
      },
    ]);
    setRecommended([
      { id: "3", title: "Toàn Trí Độc Giả", latestChapter: 180 },
      { id: "4", title: "Thần Sùng Thế Giới", latestChapter: 95 },
    ]);
    setIsLoading(false);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Chào mừng trở lại, {user?.email || "Độc giả"}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi tiến trình đọc và khám phá gợi ý dành riêng cho bạn.
        </p>
      </div>

      {/* Reading Progress Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Truyện Đang Đọc Dở
        </h2>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {readingList.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {item.title}
                  </h3>
                  <span className="text-xs font-semibold text-orange-500">
                    Chap {item.currentChapter}
                  </span>
                </div>
                <ReadingProgress progressPct={item.progressPct} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Đề Xuất Cho Bạn
        </h2>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommended.map((rec) => (
              <Link key={rec.id} href={ROUTES.COMIC_DETAIL(rec.id)}>
                <Card className="p-4 hover:border-primary transition-all cursor-pointer">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>
                  {rec.latestChapter && (
                    <p className="text-xs text-slate-500 mt-1">
                      Mới nhất: Chap {rec.latestChapter}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
