"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { getReadingHistory } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";

export function useComicDetailPresenter() {
  const params = useParams();
  const comicId = params.comicId as string;

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    comic: Comic | null;
    chapters: Chapter[];
    categories: Category[];
  }>({
    queryKey: ["comic-detail", comicId],
    queryFn: async () => {
      try {
        const [comicRes, chaptersRes, catsRes] = await Promise.all([
          apiClient.get<any>(`/api/comics/${comicId}`).catch(() => null),
          apiClient.get<any>(`/api/comics/${comicId}/chapters`).catch(() => []),
          apiClient.get<any>("/api/categories").catch(() => []),
        ]);

        const comicData = comicRes
          ? Array.isArray(comicRes)
            ? comicRes[0]
            : comicRes?.comic || comicRes
          : null;

        const chaptersData: Chapter[] = Array.isArray(chaptersRes)
          ? chaptersRes
          : chaptersRes?.items || chaptersRes?.chapters || [];

        const sortedChapters = chaptersData.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );

        const categoriesData: Category[] = Array.isArray(catsRes)
          ? catsRes
          : [];

        return {
          comic: comicData,
          chapters: sortedChapters,
          categories: categoriesData,
        };
      } catch (error) {
        console.error("Lỗi tải chi tiết truyện:", error);
        toast.error("Không thể tải thông tin truyện.");
        throw error;
      }
    },
    enabled: !!comicId,
  });

  const { data: readingHistory } = useQuery({
    queryKey: ["reading-history", comicId],
    queryFn: () => getReadingHistory(),
    enabled: !!comicId,
    retry: false,
  });

  const comic = data?.comic ?? null;
  const chapters = data?.chapters ?? [];
  const categories = data?.categories ?? [];
  const loading = isLoading || !comicId;

  const readChapters = new Set<number>(
    (readingHistory || [])
      .filter((h) => h.comicId === comicId)
      .map((h) => h.chapterNumber),
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "https://placehold.co/400x600/png?text=No+Cover";
  };

  const getVietnameseStatus = (status: string) => {
    if (status === "completed") return "Hoàn thành";
    if (status === "ongoing") return "Đang cập nhật";
    if (status === "published") return "Đã xuất bản";
    if (status === "draft") return "Bản nháp";
    return "Đang cập nhật";
  };

  const rawCover = (comic as any)?.coverUrl || (comic as any)?.cover_url || "";
  const coverUrl = rawCover
    ? proxiedR2ImageUrl(rawCover)
    : "https://placehold.co/400x600/png?text=No+Cover";

  const latestChapter = chapters.length > 0 ? chapters[0] : null;
  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;

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

  return {
    comicId,
    comic,
    chapters,
    categories,
    loading,
    isLoginModalOpen,
    setIsLoginModalOpen,
    readChapters,
    handleImageError,
    getVietnameseStatus,
    coverUrl,
    latestChapter,
    firstChapter,
    categoryArray,
  };
}
