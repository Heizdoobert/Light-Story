"use client";

import React from "react";
import Link from "next/link";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { AdRenderer } from "@/components/reader/AdRenderer";
import { useHomePagePresenter } from "@/hooks/presenters/useHomePagePresenter";

type HomePageProps = {
  initialComics?: Comic[];
};

export const HomePage: React.FC<HomePageProps> = ({ initialComics = [] }) => {
  const {
    t,
    comics,
    latestChapters,
    trendingComics,
    trendingLoaded,
    loading,
    historyComics,
    getComicCover,
    applyComicCoverFallback,
  } = useHomePagePresenter(initialComics);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-6">
      {/* VÙNG QUẢNG CÁO TRANG CHỦ (Top) */}
        <AdRenderer position="header" />

        {/* 1. TRUYỆN PHỔ BIẾN / TRENDING SLIDER */}
        <section className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-[#001eff] to-[#8900ff] text-white px-4 py-2.5 flex items-center gap-2 font-bold uppercase text-sm tracking-wide">
            <span>👍</span>
            <h2>{t("popular_comics")}</h2>
          </div>
          {trendingComics.length > 0 ? (
            <div className="trending-scroll p-3 sm:p-4 flex overflow-x-auto gap-3 sm:gap-4 scroll-smooth">
              {trendingComics.map((comic) => (
                <Link
                  key={`trending-${comic.id}`}
                  href={`/comics/${comic.id}`}
                  className="group relative w-32 sm:w-40 lg:w-44 flex-shrink-0 outline-none block"
                >
                  <div className="relative overflow-hidden rounded-lg aspect-[3/4] bg-slate-100 dark:bg-[#000b13] border border-slate-200 dark:border-white/10">
                    <img
                      src={getComicCover(comic)}
                      alt={comic.title}
                      width={300}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={applyComicCoverFallback}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                      <h3 className="font-bold text-xs line-clamp-1 group-hover:text-[#39ff14] transition-colors">
                        {comic.title}
                      </h3>
                      <p className="text-[10px] text-slate-300">
                        {latestChapters[comic.id]?.title || "Chapter 1"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : !trendingLoaded ? (
            <div className="p-3 sm:p-4 flex overflow-x-auto gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="w-32 sm:w-40 lg:w-44 flex-shrink-0">
                  <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* CONTINUE READING */}
        {historyComics.length > 0 ? (
          <section className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#8900ff] to-[#ff008d] text-white px-4 py-2.5 flex items-center gap-2 font-bold uppercase text-sm tracking-wide">
              <span>📖</span>
              <h2>{t("continue_reading")}</h2>
            </div>
            <div className="p-3 sm:p-4 flex overflow-x-auto gap-3 sm:gap-4 scroll-smooth">
              {historyComics.map((comic) => (
                <Link
                  key={`history-${comic.id}`}
                  href={`/comics/${comic.id}/chapter/${comic.chapterId}`}
                  className="group relative w-32 sm:w-40 lg:w-44 flex-shrink-0 outline-none block"
                >
                  <div className="relative overflow-hidden rounded-lg aspect-[3/4] bg-slate-100 dark:bg-[#000b13] border border-slate-200 dark:border-white/10">
                    <img
                      src={getComicCover(comic)}
                      alt={comic.title}
                      width={300}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={applyComicCoverFallback}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                      <h3 className="font-bold text-xs line-clamp-1 group-hover:text-[#39ff14] transition-colors">
                        {comic.title}
                      </h3>
                      <p className="text-[10px] text-slate-300">
                        {t("chapter")} {comic.chapterNumber}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* VÙNG QUẢNG CÁO GIỮA TRANG CHỦ */}
        <AdRenderer position="middle" />

        {/* 2-COLUMN LAYOUT: TRUYỆN MỚI CẬP NHẬT + TOP TRUYỆN ĐỌC NHIỀU */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT COLUMN: TRUYỆN MỚI CẬP NHẬT (3/4 width) */}
          <main className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-[#001eff] to-[#8900ff] text-white px-4 py-2.5 flex items-center gap-2 font-bold uppercase text-sm tracking-wide">
                <span>🕒</span>
                <h2>{t("newly_updated_comics")}</h2>
              </div>

              {loading ? (
                <div className="py-16 flex justify-center">
                  <div className="w-8 h-8 border-4 border-[#001eff]/30 border-t-[#001eff] rounded-full animate-spin"></div>
                </div>
              ) : comics.length === 0 ? (
                <div className="text-center p-12 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  {t("no_comics_yet")}
                </div>
              ) : (
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {comics.map((comic) => (
                    <div
                      key={comic.id}
                      className="flex gap-3 p-2 border border-slate-100 dark:border-white/10 rounded-lg hover:border-[#001eff] dark:hover:border-[#39ff14] transition-colors dark:bg-[#000b13]/60"
                    >
                      <Link
                        href={`/comics/${comic.id}`}
                        className="relative w-24 h-32 flex-shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-[#000000]"
                      >
                        <img
                          src={getComicCover(comic)}
                          alt={comic.title}
                          width={300}
                          height={400}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={applyComicCoverFallback}
                        />
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <Link
                            href={`/comics/${comic.id}`}
                            className="font-bold text-sm text-slate-800 dark:text-white hover:text-[#ff008d] dark:hover:text-[#39ff14] transition-colors line-clamp-1"
                          >
                            {comic.title}
                          </Link>
                          <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {comic.author || t("updating")}
                          </p>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between items-center bg-slate-50 dark:bg-[#1c1c1c] px-2 py-1 rounded">
                            <span className="font-medium text-[#001eff] dark:text-[#ff008d] truncate">
                              » {latestChapters[comic.id]?.title || "Chapter 1"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#39ff14] shrink-0 ml-1">
                              {t("new_badge")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href="/search"
                className="px-6 py-2.5 bg-[#001eff] hover:bg-[#8900ff] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-sm"
              >
                {t("view_all_comics")}
              </Link>
            </div>
          </main>

          {/* RIGHT SIDEBAR: TOP TRUYỆN ĐỌC NHIỀU (1/4 width) */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm sticky top-24">
              <div className="bg-gradient-to-r from-[#001eff] to-[#8900ff] text-white px-4 py-2.5 flex items-center gap-2 font-bold uppercase text-sm tracking-wide">
                <span>⭐</span>
                <h2>{t("top_read_comics")}</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/10 min-h-[320px]">
                {(comics.length > 0 ? (trendingComics.length > 0 ? trendingComics : comics) : []).slice(0, 10).map((comic, idx) => (
                  <Link
                    key={`top-${comic.id}`}
                    href={`/comics/${comic.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#000b13] transition-colors group"
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? "bg-[#ff008d] text-white"
                          : idx === 1
                          ? "bg-[#8900ff] text-white"
                          : idx === 2
                          ? "bg-[#001eff] text-white"
                          : "bg-slate-100 dark:bg-[#000b13] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="relative shrink-0 w-12 h-16 overflow-hidden rounded border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#000000]">
                      <img
                        src={getComicCover(comic)}
                        alt={comic.title}
                        width={300}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={applyComicCoverFallback}
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#ff008d] dark:group-hover:text-[#39ff14] transition-colors line-clamp-1">
                        {comic.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#001eff] dark:text-[#ff008d] truncate max-w-[80%]">
                          » {latestChapters[comic.id]?.title || "Chapter 1"}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#39ff14] shrink-0">
                          {(comic.viewCount || 0).toLocaleString()} 👁
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
  );
};
