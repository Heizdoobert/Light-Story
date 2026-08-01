"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { Category } from "@/types/entities";
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
  const [_categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
