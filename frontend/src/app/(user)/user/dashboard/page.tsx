"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants/routes";
import { useUserDashboardPresenter } from "@/hooks/presenters/useUserDashboardPresenter";

export default function UserDashboardPage() {
  const {
    user,
    readingList,
    isReadingLoading,
    recommended,
    isRecommendedLoading,
    refresh,
  } = useUserDashboardPresenter();

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Chào mừng trở lại, {user?.email?.split("@")[0] || "Độc giả"}!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi tiến trình đọc và khám phá gợi ý dành riêng cho bạn.
          </p>
        </div>

        <button
          onClick={refresh}
          title="Làm mới tiến trình"
          className="self-start sm:self-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Reading Progress Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={20} className="text-orange-500" />
            <span>Tiến Trình Đọc Gần Đây</span>
          </h2>
          {readingList.length > 0 && (
            <Link
              href={ROUTES.USER.HISTORY}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <span>Xem tất cả lịch sử</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {isReadingLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : readingList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingList.map((item) => {
              const readUrl = item.chapterId
                ? ROUTES.CHAPTER_READER(item.storyId, item.chapterId)
                : ROUTES.COMIC_DETAIL(item.storyId);

              return (
                <Card
                  key={item.storyId}
                  className="p-5 flex flex-col justify-between space-y-4 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 transition-all rounded-2xl bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {item.title}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 shrink-0">
                        Chap {item.currentChapterNumber} / {item.totalChapters}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Tiến độ hoàn thành</span>
                        <span className="font-semibold text-emerald-500">{item.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(4, Math.min(100, item.progressPercent))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Link
                    href={readUrl}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    <span>Tiếp tục đọc</span>
                    <ChevronRight size={14} />
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
            <BookOpen size={32} className="mx-auto text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bạn chưa có lịch sử đọc truyện nào. Hãy khám phá kho truyện bên dưới để bắt đầu đọc nhé!
            </p>
            <Link
              href={ROUTES.COMICS}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors"
            >
              <span>Khám phá truyện</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparkles size={20} className="text-cyan-500" />
          <span>Gợi Ý Thịnh Hành Dành Cho Bạn</span>
        </h2>

        {isRecommendedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((rec) => (
              <Link key={rec.id} href={ROUTES.COMIC_DETAIL(rec.id)}>
                <Card className="p-4 hover:border-cyan-500/50 transition-all cursor-pointer rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between group">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-1">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Thịnh hành nhất hôm nay</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
