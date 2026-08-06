"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getReadingHistory, HistoryItem } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { useLanguage } from "@/context/LanguageContext";

import { fetchStoriesPage, fetchStoryById } from "@/services/comics/story.service";
import { supabase } from "@/lib/supabase/client";

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
        let cats: Category[] = [];
        if (supabase) {
          const { data } = await supabase.from("categories").select("*");
          if (data) cats = data as Category[];
        }
        setCategories(cats);

        const { items: trendingData } = await fetchStoriesPage({ page: 1, pageSize: 6, sort: "most_viewed" });
        setTrendingComics(trendingData as any);
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
          comicIds.map((id) => fetchStoryById(id).catch(() => null)),
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
        const { items } = await fetchStoriesPage({ page: 1, pageSize: 15, sort: "newest" });
        const comicsData = items.length > 0 ? items : initialComics;

        if (!isMounted) return;

        setComics(comicsData as any);
        setLoading(false);

        if (comicsData.length > 0) {
          try {
            const comicIds = comicsData.map((c: any) => c.id).join(",");
            let chapters: any[] = [];
            try {
              const batchRes = await apiClient.get<any>(`/api/comics/chapters/batch?comicIds=${comicIds}`);
              chapters = Array.isArray(batchRes) ? batchRes : batchRes?.chapters || [];
            } catch {
              if (supabase) {
                const ids = comicsData.map((c: any) => c.id);
                const { data } = await supabase.from("chapters").select("*").in("story_id", ids);
                if (data) chapters = data;
              }
            }
            const chapterMap: Record<string, Chapter> = {};
            for (const ch of chapters) {
              if (ch.story_id && (!chapterMap[ch.story_id] || (ch.chapter_number ?? 0) > (chapterMap[ch.story_id].chapter_number ?? 0))) {
                chapterMap[ch.story_id] = ch;
              }
            }
            if (isMounted) setLatestChapters(chapterMap);
          } catch {
            // silent fallback
          }
        }
      } catch (error) {
        console.error("Lỗi tải danh sách truyện tranh:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadComics();
    return () => {
      isMounted = false;
    };
  }, []);

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
