"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getReadingHistory, HistoryItem } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { useLanguage } from "@/context/LanguageContext";

import { fetchStoriesPage, fetchStoryById } from "@/services/comics/story.service";
import { applyComicCoverFallback } from "@/lib/utils/image-url";
import { QUERY_KEYS } from "@/lib/constants/query-keys";

type HistoryComic = Comic & { chapterNumber?: number; chapterId?: string };

export function useHomePagePresenter(
  initialComics: Comic[] = [],
  initialTrending: Comic[] = [],
  initialLatestChapters: Record<string, Chapter> = {},
  hydrated = false,
) {
  const { t } = useLanguage();

  // 1. Categories query: key QUERY_KEYS.categories.all, staleTime 60s, gcTime 5m
  useQuery({
    queryKey: QUERY_KEYS.categories.all,
    queryFn: async () => {
      try {
        const data = await apiClient.get<Category[]>("/api/categories");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // 2. Trending query: key QUERY_KEYS.stories.trending, initialData if hydrated or initialTrending.length > 0, staleTime 60s
  const hasTrendingInitial = hydrated || initialTrending.length > 0;
  const trendingQuery = useQuery({
    queryKey: QUERY_KEYS.stories.trending,
    queryFn: async () => {
      try {
        const { items: trendingData } = await fetchStoriesPage({ page: 1, pageSize: 6, sort: "most_viewed" });
        return (trendingData || []) as unknown as Comic[];
      } catch (error) {
        console.error("Lỗi tải dữ liệu khởi tạo:", error);
        return [];
      }
    },
    initialData: hasTrendingInitial ? initialTrending : undefined,
    staleTime: 60_000,
  });

  // 3. Comics list query: key QUERY_KEYS.stories.list({ page: 1, pageSize: 15, sort: "newest" }), initialData if hydrated or initialComics.length > 0, staleTime 60s
  const hasComicsInitial = hydrated || initialComics.length > 0;
  const comicsListQuery = useQuery({
    queryKey: QUERY_KEYS.stories.list({ page: 1, pageSize: 15, sort: "newest" }),
    queryFn: async () => {
      try {
        const { items } = await fetchStoriesPage({ page: 1, pageSize: 15, sort: "newest" });
        return (items.length > 0 ? items : initialComics) as unknown as Comic[];
      } catch (error) {
        console.error("Lỗi tải danh sách truyện tranh:", error);
        return initialComics;
      }
    },
    initialData: hasComicsInitial ? initialComics : undefined,
    staleTime: 60_000,
  });

  const comics = (comicsListQuery.data ?? initialComics) as Comic[];
  const comicIds = comics.map((c) => c.id).filter(Boolean).join(",");

  // 4. Batch latest chapters query: key QUERY_KEYS.chapters.batch(comicIds), staleTime 60s
  const chaptersQuery = useQuery({
    queryKey: QUERY_KEYS.chapters.batch(comicIds),
    queryFn: async () => {
      if (!comicIds) return initialLatestChapters;
      let chapters: Chapter[] = [];
      try {
        const batchRes = await apiClient.get<Chapter[] | { chapters?: Chapter[] }>(`/api/comics/chapters/batch?comicIds=${comicIds}`);
        chapters = Array.isArray(batchRes) ? batchRes : batchRes?.chapters || [];
      } catch {
        return initialLatestChapters;
      }
      const chapterMap: Record<string, Chapter> = { ...initialLatestChapters };
      for (const ch of chapters) {
        if (ch.story_id && (!chapterMap[ch.story_id] || (ch.chapter_number ?? 0) > (chapterMap[ch.story_id].chapter_number ?? 0))) {
          chapterMap[ch.story_id] = ch;
        }
      }
      return chapterMap;
    },
    enabled: comicIds.length > 0 && !hydrated,
    initialData: Object.keys(initialLatestChapters).length > 0 ? initialLatestChapters : undefined,
    staleTime: 60_000,
  });

  // 5. Reading history query: key QUERY_KEYS.history.all, staleTime 60s
  const historyQuery = useQuery({
    queryKey: QUERY_KEYS.history.all,
    queryFn: async () => {
      try {
        const history: HistoryItem[] = await getReadingHistory();
        if (!history?.length) return [];
        const uniqueComicIds = [...new Set(history.map((h) => h.comicId))].slice(0, 8);
        const details = await Promise.all(
          uniqueComicIds.map((id) => fetchStoryById(id).catch(() => null)),
        );
        const merged = details
          .filter((d): d is NonNullable<typeof d> => Boolean(d))
          .map((d) => {
            const h = history.find((item) => item.comicId === d.id);
            return { ...d, chapterNumber: h?.chapterNumber, chapterId: h?.chapterId };
          });
        return merged as unknown as HistoryComic[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const trendingComics = (trendingQuery.data ?? initialTrending) as Comic[];
  const trendingLoaded = hasTrendingInitial || !trendingQuery.isLoading;
  const loading = !hasComicsInitial && comicsListQuery.isLoading;
  const latestChapters = chaptersQuery.data ?? initialLatestChapters;
  const historyComics = historyQuery.data ?? [];

  const getComicCover = useCallback((comic: Partial<Comic> | Record<string, unknown>): string => {
    const raw = (comic as { coverUrl?: string; cover_url?: string }).coverUrl || (comic as { coverUrl?: string; cover_url?: string }).cover_url || "";
    if (!raw) return "https://placehold.co/400x600/png?text=No+Cover";
    return proxiedR2ImageUrl(raw);
  }, []);

  return {
    t,
    comics,
    latestChapters,
    trendingComics,
    trendingLoaded,
    loading,
    historyComics,
    getComicCover,
    applyComicCoverFallback,
  };
}
