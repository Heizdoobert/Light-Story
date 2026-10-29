"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { getVietnameseStatus } from "@/lib/utils/status-styles";
import { applyComicCoverFallback } from "@/lib/utils/image-url";
import { searchClient, type SearchPageResult, type StoryItem } from "@/sdk/gateway";

export function useSearchPresenter(
  initialCategory?: string,
  initialData?: SearchPageResult<StoryItem> | null,
) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const categoryParam = searchParams.get("category") || initialCategory || "all";
  const category = categoryParam !== "all" ? categoryParam : "all";

  const tagParam = searchParams.get("tag") || "all";
  const tag =
    tagParam !== "all" ? decodeURIComponent(tagParam) : "all";

  const sort = searchParams.get("sort") || "newest";
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam, 10) || 1;

  const [comics, setComics] = useState<Comic[]>(
    (initialData?.items as unknown as Comic[]) ?? [],
  );
  const [loading, setLoading] = useState(initialData ? false : true);

  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 1);
  const [totalItems, setTotalItems] = useState(initialData?.total ?? 0);

  const [showFilter, setShowFilter] = useState(false);
  const initialUsedRef = useRef(Boolean(initialData));

  useEffect(() => {
    if (initialUsedRef.current) {
      initialUsedRef.current = false;
      return;
    }

    const fetchAndFilterResults = async () => {
      setLoading(true);
      try {
        const res = await searchClient.searchStories({
          page: currentPage,
          pageSize: 12,
          keyword: keyword || undefined,
          category: category !== "all" ? category : undefined,
          tag: tag !== "all" ? tag : undefined,
          sort: (sort === "newest" || sort === "oldest" || sort === "most_viewed") ? sort : undefined,
        });

        setComics(res.items as unknown as Comic[]);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || 0);
      } catch (error) {
        try {
          const { items, total } = await fetchStoriesPage({
            page: currentPage,
            pageSize: 12,
            keyword,
            category,
            tag,
            sort: (sort === "newest" || sort === "oldest" || sort === "most_viewed") ? sort : undefined,
          });
          setComics(items as unknown as Comic[]);
          setTotalPages(Math.ceil((total || 0) / 12) || 1);
          setTotalItems(total || 0);
        } catch {
          console.error("Lỗi tải kết quả tìm kiếm:", error);
          toast.error("Đã xảy ra lỗi khi tìm kiếm.");
        }
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
