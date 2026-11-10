"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { getReadingHistory } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";

import { fetchStoryById } from "@/services/comics/story.service";
import { fetchChaptersByStoryId } from "@/services/comics/chapter.service";
import { apiClient } from "@/lib/api/apiClient";
import { getVietnameseStatus } from "@/lib/utils/status-styles";
import { QUERY_KEYS } from "@/lib/constants/query-keys";

type ComicDetailProps = {
  initialComic?: Comic | null;
  initialChapters?: Chapter[];
  initialCategories?: Category[];
  hydrated?: boolean;
};

export function useComicDetailPresenter({
  initialComic = null,
  initialChapters = [],
  initialCategories = [],
  hydrated = false,
}: ComicDetailProps = {}) {
  const params = useParams();
  const comicId = (Array.isArray(params?.comicId) ? params.comicId[0] : (params?.comicId as string)) || "";

  // 1. Story detail query: key QUERY_KEYS.stories.detail(comicId), initialData: initialComic, staleTime 60s
  const hasInitialComic = hydrated || Boolean(initialComic);
  const storyQuery = useQuery({
    queryKey: QUERY_KEYS.stories.detail(comicId),
    queryFn: async () => {
      try {
        const comicData = await fetchStoryById(comicId);
        return (comicData || null) as unknown as Comic | null;
      } catch (error) {
        console.error("Lỗi tải chi tiết truyện:", error);
        toast.error("Không thể tải thông tin truyện.");
        return null;
      }
    },
    initialData: initialComic ?? undefined,
    enabled: Boolean(comicId),
    staleTime: 60_000,
  });

  // 2. Chapters query: key QUERY_KEYS.chapters.byStory(comicId), initialData: initialChapters, staleTime 60s
  const sortedInitialChapters = useMemo(() => {
    return initialChapters.length > 0
      ? [...initialChapters].sort((a, b) => (a.chapter_number ?? 0) - (b.chapter_number ?? 0))
      : initialChapters;
  }, [initialChapters]);

  const hasInitialChapters = hydrated || initialChapters.length > 0;
  const chaptersQuery = useQuery({
    queryKey: QUERY_KEYS.chapters.byStory(comicId),
    queryFn: async () => {
      try {
        const chaptersData = await fetchChaptersByStoryId(comicId);
        return (chaptersData || []).sort(
          (a, b) => (a.chapter_number ?? 0) - (b.chapter_number ?? 0),
        );
      } catch {
        return [];
      }
    },
    initialData: hasInitialChapters ? sortedInitialChapters : undefined,
    enabled: Boolean(comicId),
    staleTime: 60_000,
  });

  // 3. Categories query: key QUERY_KEYS.categories.all, staleTime 60s, gcTime 5m
  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.categories.all,
    queryFn: async () => {
      try {
        const data = await apiClient.get<Category[]>("/api/categories");
        return data || [];
      } catch {
        return [];
      }
    },
    initialData: (hydrated || initialCategories.length > 0) ? initialCategories : undefined,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // 4. Reading history query: key QUERY_KEYS.history.all, staleTime 60s
  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.history.all,
    queryFn: async () => {
      try {
        return await getReadingHistory();
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const comic = storyQuery.data ?? initialComic;
  const chapters = chaptersQuery.data ?? sortedInitialChapters;
  const categories = categoriesQuery.data ?? initialCategories;

  const loading = !hydrated && (!hasInitialComic || !hasInitialChapters) && (storyQuery.isLoading || chaptersQuery.isLoading);

  const readChapters = useMemo(() => {
    if (!historyQuery.data) return new Set<number>();
    const read = historyQuery.data
      .filter((h) => h.comicId === comicId)
      .map((h) => h.chapterNumber);
    return new Set<number>(read);
  }, [historyQuery.data, comicId]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "https://placehold.co/400x600/png?text=No+Cover";
  };

  const comicRecord = comic as Record<string, unknown> | null | undefined;
  const rawCover =
    (typeof comicRecord?.coverUrl === 'string' ? comicRecord.coverUrl : undefined) ||
    (typeof comicRecord?.cover_url === 'string' ? comicRecord.cover_url : '') ||
    '';
  const coverUrl = rawCover
    ? proxiedR2ImageUrl(rawCover)
    : "https://placehold.co/400x600/png?text=No+Cover";

  const latestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
  const firstChapter = chapters.length > 0 ? chapters[0] : null;

  let categoryArray: string[] = [];
  if (comic?.category) {
    if (Array.isArray(comic.category)) {
      categoryArray = comic.category;
    } else if (typeof comic.category === "string") {
      try {
        const parsed = JSON.parse(comic.category);
        categoryArray = Array.isArray(parsed) ? parsed : [comic.category];
      } catch {
        categoryArray = (comic.category as string)
          .split(",")
          .map((c) => c.trim());
      }
    }
  }

  let tagArray: string[] = [];
  if (comic?.tags) {
    if (Array.isArray(comic.tags)) {
      tagArray = comic.tags;
    } else if (typeof comic.tags === "string") {
      tagArray = (comic.tags as string)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  return {
    comicId,
    comic,
    chapters,
    categories,
    loading,
    readChapters,
    handleImageError,
    getVietnameseStatus,
    coverUrl,
    latestChapter,
    firstChapter,
    categoryArray,
    tagArray,
  };
}
