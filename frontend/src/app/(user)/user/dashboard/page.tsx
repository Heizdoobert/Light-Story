"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/features/use-user";
import { ROUTES } from "@/lib/constants/routes";
import { useReadingHistory } from "@/hooks/features/useReadingHistory";
import { fetchStoriesByIds, fetchStoriesPage } from "@/services/comics/story.service";

interface RecommendedItem {
  id: string;
  title: string;
}

interface ReadingItem {
  id: string;
  title: string;
  currentChapter: number;
}

export default function UserDashboardPage() {
  const { user } = useUser();
  const { history, isLoading: isHistoryLoading } = useReadingHistory();
  const [readingList, setReadingList] = useState<ReadingItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedItem[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!history?.length) {
          if (!cancelled) setReadingList([]);
          return;
        }
        const comicIds = [...new Set(history.map((h) => h.comicId))];
        const details = await fetchStoriesByIds(comicIds);
        if (cancelled) return;
        const merged = details
          .map((d) => {
            const h = history.find((item) => item.comicId === d.id);
            return {
              id: d.id,
              title: d.title,
              currentChapter: h?.chapterNumber ?? 0,
            };
          })
          .slice(0, 8);
        setReadingList(merged);
      } catch {
        /* silent */
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { items } = await fetchStoriesPage({ page: 1, pageSize: 6, sort: "most_viewed" });
        if (cancelled) return;
        const mapped: RecommendedItem[] = items.map((c) => ({
          id: c.id,
          title: c.title,
        }));
        setRecommended(mapped);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setRecommendedLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
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
      {/* ponytail: progress bar removed — progress% needs total chapter count, which neither Story nor reading history provides; was hardcoded 0. */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Truyện Đang Đọc Dở
        </h2>
        {isHistoryLoading ? (
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
        {recommendedLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommended.map((rec) => (
              <Link key={rec.id} href={ROUTES.COMIC_DETAIL(rec.id)}>
                {/* ponytail: latestChapter line removed — Story has no latest-chapter field; render path was dead. */}
                <Card className="p-4 hover:border-primary transition-all cursor-pointer">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
