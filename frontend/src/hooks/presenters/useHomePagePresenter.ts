"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getReadingHistory, HistoryItem } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { useLanguage } from "@/context/LanguageContext";

type HistoryComic = Comic & { chapterNumber?: number; chapterId?: string };

export function useHomePagePresenter(initialComics: Comic[] = []) {
  const { t } = useLanguage();

  useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const cats = await apiClient.get<any>("/api/categories").catch(() => []);
      return Array.isArray(cats) ? cats : [];
    },
  });

  const { data: trendingComics = [], isLoading: trendingLoading } = useQuery<Comic[]>({
    queryKey: ["home", "trending"],
    queryFn: async () => {
      const trendingRes = await apiClient
        .get<any>("/api/comics?sort=most_viewed&limit=6")
        .catch(() => null);
      return Array.isArray(trendingRes)
        ? trendingRes
        : trendingRes?.items || trendingRes?.comics || [];
    },
  });

  const { data: comicsData, isLoading: loading } = useQuery<Comic[]>({
    queryKey: ["home", "comics"],
    queryFn: async () => {
      const response = await apiClient
        .get<any>("/api/comics?sort=newest&limit=15")
        .catch(() => null);
      let comicsData = Array.isArray(response)
        ? response
        : response?.items || response?.comics || initialComics;
      return comicsData.slice(0, 15);
    },
    initialData: initialComics.length > 0 ? initialComics : undefined,
  });
  const comics = comicsData ?? [];

  const { data: latestChapters = {} } = useQuery<Record<string, Chapter>>({
    queryKey: ["home", "latest-chapters", comics.map((c) => c.id).join(",")],
    queryFn: async () => {
      const comicIds = comics.map((c: Comic) => c.id).join(",");
      const batchRes = await apiClient
        .get<any>(`/api/comics/chapters/batch?comicIds=${comicIds}`)
        .catch(() => []);
      const chapters: any[] = Array.isArray(batchRes)
        ? batchRes
        : batchRes?.chapters || [];
      const chapterMap: Record<string, Chapter> = {};
      for (const ch of chapters) {
        if (ch.story_id) chapterMap[ch.story_id] = ch;
      }
      return chapterMap;
    },
    enabled: comics.length > 0,
  });

  const { data: historyComics = [] } = useQuery<HistoryComic[]>({
    queryKey: ["home", "reading-history"],
    queryFn: async () => {
      const history: HistoryItem[] = await getReadingHistory();
      if (!history?.length) return [];
      const comicIds = [...new Set(history.map((h) => h.comicId))];
      const details = await Promise.all(
        comicIds.map((id) =>
          apiClient.get<any>(`/api/comics/${id}`).catch(() => null),
        ),
      );
      return details
        .filter(Boolean)
        .map((d: any) => {
          const h = history.find((item) => item.comicId === d?.id);
          return { ...d, chapterNumber: h?.chapterNumber, chapterId: h?.chapterId };
        })
        .slice(0, 8);
    },
    retry: false,
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  return {
    t,
    comics,
    latestChapters,
    trendingComics,
    trendingLoaded: !trendingLoading,
    loading,
    isLoginModalOpen,
    setIsLoginModalOpen,
    historyComics,
    getComicCover,
    applyComicCoverFallback,
  };
}
