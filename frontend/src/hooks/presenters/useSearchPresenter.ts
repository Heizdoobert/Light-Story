"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { getVietnameseStatus } from "@/lib/utils/status-styles";
import { applyComicCoverFallback } from "@/lib/utils/image-url";

export function useSearchPresenter(initialCategory?: string) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const categoryParam = searchParams.get("category") || initialCategory || "all";
  const category =
    categoryParam !== "all" ? decodeURIComponent(categoryParam) : "all";

  const tagParam = searchParams.get("tag") || "all";
  const tag =
    tagParam !== "all" ? decodeURIComponent(tagParam) : "all";

  const sort = searchParams.get("sort") || "newest";
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam, 10) || 1;

  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
          tag,
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
  }, [keyword, category, tag, sort, currentPage]);

  useEffect(() => {
    document.body.style.overflow = showFilter ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFilter]);

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
    showFilter,
    setShowFilter,
    applyComicCoverFallback,
    getVietnameseStatus,
  };
}
