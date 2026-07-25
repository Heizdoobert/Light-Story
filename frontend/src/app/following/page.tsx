"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, BookmarkCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { getFollowedComics } from "@/services/comicFollow.service";

export default function FollowingPage() {
  const [followedComics, setFollowedComics] = useState(getFollowedComics());

  useEffect(() => {
    setFollowedComics(getFollowedComics());
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header onMenuClick={() => {}} onLoginClick={() => {}} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Phần Tiêu đề */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs sm:text-sm font-semibold text-primary">
              <BookmarkCheck size={16} /> Truyện theo dõi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Danh sách truyện bạn đang theo dõi
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Theo dõi nhanh các truyện yêu thích và quay lại đọc bất cứ lúc
              nào.
            </p>
          </div>
        </div>

        {/* Trạng thái trống */}
        {followedComics.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 bg-white p-8 sm:p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles size={24} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
              Chưa có truyện nào trong danh sách theo dõi
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Hãy mở một truyện và bấm nút “Theo dõi truyện”.
            </p>
          </div>
        ) : (
          /* Lưới hiển thị truyện: 2 cột (Mobile) -> 3 cột (Tablet) -> 4/5 cột (Desktop) */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 lg:gap-6">
            {followedComics.map((comic) => (
              <Link
                key={comic.id}
                href={`/comics/${comic.id}`}
                className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Ảnh bìa */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={
                      comic.coverUrl ||
                      "https://placehold.co/400x600/png?text=No+Cover"
                    }
                    alt={comic.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Lớp overlay mờ khi hover (Chỉ hiện trên desktop để giao diện xịn hơn) */}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 dark:group-hover:bg-black/20" />
                </div>

                {/* Nội dung text */}
                <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                  {/* Tiêu đề giới hạn 2 dòng để không vỡ layout */}
                  <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-tight text-slate-900 transition group-hover:text-primary dark:text-white">
                    {comic.title}
                  </h3>

                  {/* Tên tác giả */}
                  <p className="mt-1 line-clamp-1 text-[11px] sm:text-sm text-slate-500 dark:text-slate-400">
                    {comic.author || "Đang cập nhật"}
                  </p>

                  {/* Nút Xem truyện được ép xuống đáy thẻ (mt-auto) */}
                  <div className="mt-auto pt-3">
                    <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-full bg-slate-50 py-1.5 sm:py-1 sm:px-2.5 text-[10px] sm:text-xs font-semibold text-slate-600 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-800/50 dark:text-slate-300 dark:group-hover:bg-primary/20">
                      <BookOpen size={14} />
                      <span>Xem truyện</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
