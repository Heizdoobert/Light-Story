"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getReadingHistory, HistoryItem } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { useLanguage } from "@/context/LanguageContext";

type HistoryComic = Comic & { chapterNumber?: number; chapterId?: string };

export function useHomePagePresenter(initialComics: Comic[] = []) {
  const { t } = useLanguage();
  const [_categories, setCategories] = useState<Category[]>([]);
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [latestChapters, setLatestChapters] = useState<Record<string, Chapter>>({});
  const [trendingComics, setTrendingComics] = useState<Comic[]>([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  const [loading, setLoading] = useState(initialComics.length === 0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [historyComics, setHistoryComics] = useState<HistoryComic[]>([]);

  useEffect(() => {
    const loadInitData = async () => {
      try {
        const cats = await apiClient.get<any>("/api/categories").catch(() => []);
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
      } finally {
        setTrendingLoaded(true);
      }
    };
    loadInitData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const history: HistoryItem[] = await getReadingHistory();
        if (cancelled || !history?.length) return;
        const comicIds = [...new Set(history.map((h) => h.comicId))];
        const details = await Promise.all(
          comicIds.map((id) =>
            apiClient.get<any>(`/api/comics/${id}`).catch(() => null),
          ),
        );
        if (cancelled) return;
        const merged = details
          .filter(Boolean)
          .map((d: any) => {
            const h = history.find((item) => item.comicId === d?.id);
            return { ...d, chapterNumber: h?.chapterNumber, chapterId: h?.chapterId };
          })
          .slice(0, 8);
        setHistoryComics(merged);
      } catch {
        /* silent */
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
          try {
            const comicIds = comicsData.map((c: Comic) => c.id).join(",");
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
            if (isMounted) setLatestChapters(chapterMap);
          } catch {
            // silent fallback
          }
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
  }, [initialComics]);

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
    trendingLoaded,
    loading,
    isLoginModalOpen,
    setIsLoginModalOpen,
    historyComics,
    getComicCover,
    applyComicCoverFallback,
  };
}
