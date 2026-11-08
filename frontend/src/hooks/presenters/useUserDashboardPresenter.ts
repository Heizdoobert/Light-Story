"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { QUERY_KEYS, DEFAULT_CACHE_CONFIG } from "@/lib/constants/query-keys";
import { ROUTES } from "@/lib/constants/routes";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { useReadingHistory } from "@/hooks/features/useReadingHistory";
import { useUser } from "@/hooks/features/use-user";

export interface UserReadingItem {
  storyId: string;
  title: string;
  coverUrl?: string;
  currentChapterNumber: number;
  chapterId?: string;
  totalChapters: number;
  progressPercent: number;
  updatedAt?: string;
}

export interface RecommendedItem {
  id: string;
  title: string;
}

interface UserHistoryRpcRow {
  story_id?: string;
  comic_id?: string;
  story_title?: string;
  title?: string;
  story_cover?: string;
  cover_url?: string;
  chapter_id?: string;
  chapter_number?: number;
  total_chapters?: number;
  progress_percent?: number;
  updated_at?: string;
}

export function useUserDashboardPresenter() {
  const { user } = useUser();
  const { history: localHistory } = useReadingHistory();

  // 1. Reading progress query with 60s stale caching
  const readingQuery = useQuery<UserReadingItem[]>({
    queryKey: QUERY_KEYS.user.dashboard,
    queryFn: async () => {
      try {
        const rows = await apiClient.get<UserHistoryRpcRow[]>(ROUTES.API.USER.HISTORY);
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r) => {
            const storyId = r.story_id || r.comic_id || "";
            const currentChap = Number(r.chapter_number ?? 0);
            const totalChap = Number(r.total_chapters ?? (currentChap > 0 ? currentChap : 1));
            const pct =
              r.progress_percent !== undefined
                ? Number(r.progress_percent)
                : Math.min(100, Math.round((currentChap / Math.max(1, totalChap)) * 100));

            return {
              storyId,
              title: r.story_title || r.title || "Truyện",
              coverUrl: r.story_cover || r.cover_url,
              currentChapterNumber: currentChap,
              chapterId: r.chapter_id,
              totalChapters: totalChap,
              progressPercent: pct,
              updatedAt: r.updated_at,
            };
          });
        }
      } catch {
        /* fallback to local storage history below */
      }

      // Fallback if API fails or unauthenticated: map local reading history
      if (localHistory && localHistory.length > 0) {
        return localHistory.slice(0, 8).map((h) => ({
          storyId: h.comicId,
          title: "Đang đọc",
          currentChapterNumber: h.chapterNumber ?? 0,
          chapterId: h.chapterId,
          totalChapters: Math.max(1, h.chapterNumber ?? 1),
          progressPercent: 50,
        }));
      }

      return [];
    },
    staleTime: DEFAULT_CACHE_CONFIG.staleTime,
    gcTime: DEFAULT_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
  });

  // 2. Recommendations query
  const recommendedQuery = useQuery<RecommendedItem[]>({
    queryKey: QUERY_KEYS.stories.trending,
    queryFn: async () => {
      try {
        const { items } = await fetchStoriesPage({ page: 1, pageSize: 6, sort: "most_viewed" });
        return (items || []).map((c) => ({
          id: c.id,
          title: c.title,
        }));
      } catch {
        return [];
      }
    },
    staleTime: DEFAULT_CACHE_CONFIG.staleTime,
    gcTime: DEFAULT_CACHE_CONFIG.gcTime,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    readingList: readingQuery.data ?? [],
    isReadingLoading: readingQuery.isLoading,
    recommended: recommendedQuery.data ?? [],
    isRecommendedLoading: recommendedQuery.isLoading,
    refresh: () => {
      readingQuery.refetch();
      recommendedQuery.refetch();
    },
  };
}
