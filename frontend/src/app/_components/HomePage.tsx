"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { Chapter, Category } from "@/types/entities";
import { LoginModal } from "@/components/shared/auth/LoginModal";
import { FilterMenu } from "@/app/_components/FilterMenu";
import { Header } from "@/components/shared/navigation/Header";
import { AdZone } from "@/components/shared/ads/AdZone";
import { useLanguage } from "@/modules/language/LanguageContext";

type HomePageProps = {
  initialComics?: Comic[];
};

const DEFAULT_INITIAL_COMICS: Comic[] = [];

export const HomePage: React.FC<HomePageProps> = ({ initialComics = DEFAULT_INITIAL_COMICS }) => {
  const { t } = useLanguage();
  const [_categories, setCategories] = useState<Category[]>([]);
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [latestChapters, setLatestChapters] = useState<Record<string, Chapter>>(
    {},
  );
  const [trendingComics, setTrendingComics] = useState<Comic[]>([]);

  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(initialComics.length === 0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // TẢI THỂ LOẠI & TRUYỆN THỊNH HÀNH
  useEffect(() => {
    const loadInitData = async () => {
      try {
        const cats = await apiClient
          .get<any>("/api/categories")
          .catch(() => []);
        if (Array.isArray(cats)) setCategories(cats);

        const trendingRes = await apiClient
          .get<any>("/api/comics?sort=most_viewed&limit=6")
          .catch(() => null);
        const trendingData = Array.isArray(trendingRes)
          ? trendingRes
          : trendingRes?.items || trendingRes?.comics || [];
        setTrendingComics(trendingData);
      } catch (error) {
        console.error("Lỗi tải dữ liệu khởi tạo:", error);
      }
    };
    loadInitData();
  }, []);

  // TẢI DANH SÁCH TRUYỆN MỚI NHẤT & CHAPTER (Chạy 1 lần duy nhất khi mount)
  useEffect(() => {
    let isMounted = true;
    async function loadComics() {
      if (initialComics.length === 0) setLoading(true);
      try {
        const response = await apiClient
          .get<any>("/api/comics?sort=newest&limit=15")
          .catch(() => null);

        let comicsData = Array.isArray(response)
          ? response
          : response?.items || response?.comics || initialComics;

        comicsData = comicsData.slice(0, 15);
        if (!isMounted) return;

        setComics(comicsData);
        setLoading(false);

        if (comicsData.length > 0) {
          const chapterMap: Record<string, Chapter> = {};
          const chapterPromises = comicsData.map(async (comic: Comic) => {
            try {
              const chaptersRes = await apiClient
                .get<any>(`/api/comics/${comic.id}/chapters`)
                .catch(() => []);
              const chapters: Chapter[] = Array.isArray(chaptersRes)
                ? chaptersRes
                : chaptersRes?.items || chaptersRes?.chapters || [];

              if (chapters && chapters.length > 0) {
                const sorted = chapters.sort(
                  (a, b) =>
                    new Date(b.created_at || 0).getTime() -
                    new Date(a.created_at || 0).getTime(),
                );
                chapterMap[comic.id] = sorted[0];
              }
            } catch {
              // silent fallback
            }
          });

          await Promise.all(chapterPromises);
          if (isMounted) setLatestChapters(chapterMap);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách truyện tranh:", error);
        if (isMounted) setLoading(false);
      }
    }

    loadComics();
    return () => {
      isMounted = false;
    };
  }, []);

  // Khóa cuộn trang khi mở bộ lọc
  useEffect(() => {
    document.body.style.overflow = showFilter ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFilter]);

  const getComicCover = useCallback((comic: any): string => {
    const raw = comic.coverUrl || comic.cover_url || "";
    if (!raw) return "https://placehold.co/400x600/png?text=No+Cover";
    return proxiedR2ImageUrl(raw);
  }, []);

  const applyComicCoverFallback = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const fallback = `https://placehold.co/400x600/png?text=No+Cover`;
      if (event.currentTarget.src !== fallback)
        event.currentTarget.src = fallback;
    },
    [],
  );

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500">
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 z-[70] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
                    L
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                    {t("filter_menu_title")}
                  </span>
                </div>
                <button
                  onClick={() => setShowFilter(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {/* ĐIỂM QUAN TRỌNG: Không truyền onFilterChange nữa. 
                  Điều này ép FilterMenu dùng useRouter chuyển sang trang /search 
                */}
                <FilterMenu onClose={() => setShowFilter(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Header
        onMenuClick={() => setShowFilter(true)}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-6">
        {/* VÙNG QUẢNG CÁO TRANG CHỦ (Top) */}
        <AdZone zoneId="home-top" format="banner" className="mb-4" />

        {/* 1. TRUYỆN PHỔ BIẾN / TRENDING SLIDER */}
        {trendingComics.length > 0 && (
          <section className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-[#001eff] to-[#8900ff] text-white px-4 py-2.5 flex items-center gap-2 font-bold uppercase text-sm tracking-wide">
              <span>👍</span>
              <h2>{t("popular_comics")}</h2>
            </div>
            <div className="p-3 sm:p-4 flex overflow-x-auto gap-3 sm:gap-4 no-scrollbar scroll-smooth">
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
          </section>
        )}

        {/* VÙNG QUẢNG CÁO GIỮA TRANG CHỦ */}
        <AdZone zoneId="home-mid" format="banner" />

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
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {(trendingComics.length > 0 ? trendingComics : comics).slice(0, 10).map((comic, idx) => (
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
    </div>
  );
};
