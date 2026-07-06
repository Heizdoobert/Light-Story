"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, X } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { ComicContext as Comic } from "@/services/comic.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { LoginModal } from "@/components/shared/LoginModal";
import { FilterMenu } from "@/app/_components/FilterMenu";
import { Header } from "@/components/shared/Header";

const getVietnameseStatus = (status: string) => {
  if (status === "completed") return "Hoàn thành";
  if (status === "ongoing") return "Đang cập nhật";
  if (status === "published") return "Đã xuất bản";
  if (status === "draft") return "Bản nháp";
  return "Đang cập nhật";
};

type HomePageProps = {
  initialComics?: Comic[];
};

export const HomePage: React.FC<HomePageProps> = ({ initialComics = [] }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [latestChapters, setLatestChapters] = useState<Record<string, Chapter>>(
    {},
  );
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500 text-white dark:bg-emerald-600";
      case "published":
        return "bg-blue-500 text-white dark:bg-blue-600";
      case "ongoing":
        return "bg-amber-500 text-white dark:bg-amber-600";
      case "draft":
        return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
      default:
        return "bg-indigo-500 text-white dark:bg-indigo-600"; // Màu dự phòng
    }
  };
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

  // TẢI DANH SÁCH TRUYỆN MỚI NHẤT (Không còn filterParams ở đây nữa)
  // CHỈ TẢI CHAPTER MỚI NHẤT (Sử dụng luôn danh sách truyện từ Server)
  const fetchComicsData = useCallback(async () => {
    // Nếu Server không có truyện nào thì mới bật loading
    if (initialComics.length === 0) setLoading(true);

    try {
      // 1. Dùng luôn 15 truyện từ Server truyền xuống
      let comicsData = initialComics;

      // 2. (Dự phòng) Nếu Server lỗi không có dữ liệu, Client tự gọi lại và ép lấy 15 truyện
      if (comicsData.length === 0) {
        const response = await apiClient.get<any>(
          "/api/comics?sort=newest&limit=15",
        );
        comicsData = Array.isArray(response)
          ? response
          : response?.items || response?.comics || [];
        comicsData = comicsData.slice(0, 15); // Ép cắt 15
        setComics(comicsData); // Cập nhật lại state
      }

      // 3. Chỉ đi lấy Chapter cho đúng 15 truyện này (Cực kỳ nhẹ server)
      const chapterMap: Record<string, Chapter> = {};
      const chapterPromises = comicsData.map(async (comic) => {
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
        } catch (err) {
          console.warn(`Không lấy được chapter cho comic ${comic.id}`);
        }
      });

      await Promise.all(chapterPromises);
      setLatestChapters(chapterMap);
    } catch (error) {
      console.error("Lỗi tải danh sách truyện tranh:", error);
      toast.error(getErrorMessage(error, "Lỗi tải truyện"));
    } finally {
      setLoading(false);
    }
  }, [initialComics]); // 👉 Nhớ thêm initialComics vào mảng phụ thuộc này

  useEffect(() => {
    fetchComicsData();
  }, [fetchComicsData]);

  // Khóa cuộn trang khi mở bộ lọc
  useEffect(() => {
    document.body.style.overflow = showFilter ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFilter]);

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
                    Tìm kiếm
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

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
        {trendingComics.length > 0 && (
          <div className="mb-10 pt-2 sm:pt-4">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-2xl">🔥</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Đang Thịnh Hành
              </h2>
            </div>
            <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {trendingComics.map((comic, index) => (
                <Link
                  key={`trending-${comic.id}`}
                  href={`/comics/${comic.id}`}
                  className="group block relative w-[130px] sm:w-44 lg:w-48 flex-shrink-0 snap-start outline-none cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-slate-100 dark:bg-slate-800 shadow-md group-hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800">
                    <img
                      src={comic.coverUrl}
                      alt={comic.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                      onError={applyComicCoverFallback}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90"></div>
                    <div
                      className={`absolute top-0 left-0 text-white font-black text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-br-xl shadow-lg z-10 ${index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600" : index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" : index === 2 ? "bg-gradient-to-br from-amber-700 to-orange-900" : "bg-slate-800/80 backdrop-blur-md"}`}
                    >
                      #{index + 1}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-1.5 group-hover:text-primary transition-colors">
                        {comic.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80"></span>
                        {(comic.viewCount || 0).toLocaleString()} lượt xem
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Truyện Mới Cập Nhật
          </h2>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : comics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-10 sm:p-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800/50"
          >
            <div className="text-5xl sm:text-6xl mb-6">📭</div>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-sm sm:text-lg">
              Chưa có bộ truyện nào trên hệ thống.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
            {comics.map((comic, i) => (
              <Link
                key={comic.id}
                href={`/comics/${comic.id}`}
                className="block outline-none cursor-pointer"
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 100,
                  }}
                  className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 border border-slate-100 dark:border-slate-800"
                >
                  <div className="relative overflow-hidden rounded-2xl mb-2 sm:mb-3 aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                    <img
                      src={comic.coverUrl}
                      alt={comic.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                      onError={applyComicCoverFallback}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 sm:p-5">
                      <span className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <ImageIcon size={14} className="sm:w-4 sm:h-4" /> Đọc
                        ngay
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      <span
                        className={`px-2 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${getStatusStyles(comic.status)}`}
                      >
                        {getVietnameseStatus(comic.status)}
                      </span>
                    </div>
                  </div>

                  <div className="px-1 pb-1 flex flex-col flex-1">
                    <h2 className="text-[13px] sm:text-base font-bold mb-1 text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                      {comic.title}
                    </h2>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
                      {comic.author || "Đang cập nhật"}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3 sm:mb-4 mt-auto">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded sm:rounded-md line-clamp-1 w-fit max-w-full sm:max-w-[60%]">
                        {latestChapters[comic.id]?.title || "Chưa có chương"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {latestChapters[comic.id]?.created_at
                          ? new Date(
                              latestChapters[comic.id].created_at,
                            ).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center pt-2 sm:pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-400">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary/60"></span>
                        {(comic.viewCount || 0).toLocaleString()} lượt xem
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
        <div className="flex justify-center mt-8 mb-12">
          <Link
            href="/search"
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-md transition-colors shadow-sm"
          >
            Xem thêm nhiều truyện
          </Link>
        </div>
      </div>
    </div>
  );
};
