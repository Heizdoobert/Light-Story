"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, SearchX, X } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { ComicContext as Comic } from "@/services/comic.service";
import { Category } from "@/types/entities";
import { Header } from "@/components/shared/Header";
import { LoginModal } from "@/components/shared/LoginModal";
import { FilterMenu } from "@/app/_components/FilterMenu";
import { toast } from "sonner";
import { SortDropdown } from "@/components/shared/SortDropdown";
import { Pagination } from "@/components/shared/Pagination";
import { getStatusStyles } from "@/lib/statusStyles";

const getVietnameseStatus = (status: string) => {
  if (status === "completed") return "Hoàn thành";
  if (status === "ongoing") return "Đang cập nhật";
  if (status === "published") return "Đã xuất bản";
  if (status === "draft") return "Bản nháp";
  return "Đang cập nhật";
};

function SearchContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  // Giải mã category (Fix lỗi tiếng Việt)
  const categoryParam = searchParams.get("category") || "all";
  const category =
    categoryParam !== "all" ? decodeURIComponent(categoryParam) : "all";

  // Bắt biến sort và page từ URL
  const sort = searchParams.get("sort") || "newest";
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam, 10) || 1; // 👉 Lấy trang hiện tại

  const [comics, setComics] = useState<Comic[]>([]);
  const [_categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 👉 States quản lý phân trang
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // States quản lý UI
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    apiClient
      .get<any>("/api/categories")
      .then((res) => {
        if (Array.isArray(res)) setCategories(res);
      })
      .catch((err) => console.error("Lỗi tải thể loại:", err));
  }, []);

  useEffect(() => {
    const fetchAndFilterResults = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (keyword) queryParams.append("keyword", keyword);
        if (category !== "all") queryParams.append("category", category);
        queryParams.append("sort", sort);
        queryParams.append("page", String(currentPage));
        queryParams.append("pageSize", "12");

        const response = await apiClient.get<any>(
          `/api/stories?${queryParams.toString()}`,
        );

        setComics(response?.items || []);
        setTotalPages(Math.ceil((response?.total || 0) / 12) || 1);
        setTotalItems(response?.total || 0);
      } catch (error) {
        console.error("Lỗi tải kết quả tìm kiếm:", error);
        toast.error("Đã xảy ra lỗi khi tìm kiếm.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilterResults();
  }, [keyword, category, sort, currentPage]);

  useEffect(() => {
    document.body.style.overflow = showFilter ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFilter]);

  const applyComicCoverFallback = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const fallback = `https://placehold.co/400x600/png?text=No+Cover`;
    if (event.currentTarget.src !== fallback)
      event.currentTarget.src = fallback;
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 pb-20">
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 z-70 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
                    L
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                    Bộ lọc
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
        <div className="mb-8 pt-4 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
              Danh sách truyện
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-slate-500 dark:text-slate-400">
              {keyword && (
                <span>
                  Từ khóa: <strong className="text-primary">"{keyword}"</strong>
                </span>
              )}
              {category !== "all" && (
                <span>
                  • Thể loại:{" "}
                  <strong className="text-primary">{category}</strong>
                </span>
              )}
              <span className="ml-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                {/* 👉 HIỂN THỊ TỔNG SỐ TRUYỆN CHÍNH XÁC */}
                {totalItems} kết quả
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 mt-2 sm:mt-0">
            <SortDropdown />
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : comics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 sm:p-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-800/50"
          >
            <SearchX
              size={64}
              className="mx-auto text-slate-300 dark:text-slate-700 mb-6"
            />
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-lg">
              Không tìm thấy truyện nào khớp với yêu cầu của bạn.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              Về trang chủ
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {comics.map((comic, i) => (
                <Link
                  key={comic.id}
                  href={`/comics/${comic.id}`}
                  className="block outline-none cursor-pointer"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="relative overflow-hidden rounded-2xl mb-2 aspect-3/4 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={comic.coverUrl || "https://placehold.co/400x600/png?text=No+Cover"}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={applyComicCoverFallback}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 sm:p-4">
                        <span className="text-white text-xs font-bold flex items-center gap-1.5 translate-y-4 group-hover:translate-y-0 transition-transform">
                          <ImageIcon size={14} /> Đọc ngay
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span
                          className={`px-2 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${getStatusStyles(comic.status)}`}
                        >
                          {getVietnameseStatus(comic.status)}
                        </span>
                      </div>
                    </div>
                    <div className="px-1 pb-1 flex flex-col flex-1">
                      <h2 className="text-[13px] sm:text-sm font-bold mb-1 text-slate-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                        {comic.title}
                      </h2>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
                        {comic.author || "Đang cập nhật"}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* 👉 COMPONENT THANH PHÂN TRANG */}
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
