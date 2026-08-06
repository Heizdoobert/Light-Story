"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

export function useSearchPresenter() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const categoryParam = searchParams.get("category") || "all";
  const category =
    categoryParam !== "all" ? decodeURIComponent(categoryParam) : "all";

  const sort = searchParams.get("sort") || "newest";
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam, 10) || 1;

  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const fetchAndFilterResults = async () => {
      setLoading(true);
      try {
        const { items, total } = await fetchStoriesPage({
          page: currentPage,
          pageSize: 12,
          keyword,
          category,
          sort: sort as any,
        });

        setComics(items as any);
        setTotalPages(Math.ceil((total || 0) / 12) || 1);
        setTotalItems(total || 0);
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

  const getVietnameseStatus = (status: string) => {
    if (status === "completed") return "Hoàn thành";
    if (status === "ongoing") return "Đang cập nhật";
    if (status === "published") return "Đã xuất bản";
    if (status === "draft") return "Bản nháp";
    return "Đang cập nhật";
  };

  return {
    t,
    keyword,
    category,
    sort,
    currentPage,
    comics,
    loading,
    totalPages,
    totalItems,
    isLoginModalOpen,
    setIsLoginModalOpen,
    showFilter,
    setShowFilter,
    applyComicCoverFallback,
    getVietnameseStatus,
  };
}
