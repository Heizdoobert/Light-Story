"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { getReadingHistory } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";

import { fetchStoryById } from "@/services/comics/story.service";
import { fetchChaptersByStoryId } from "@/services/comics/chapter.service";
import { supabase } from "@/infrastructure/supabase/client";

export function useComicDetailPresenter() {
  const params = useParams();
  const comicId = params.comicId as string;

  const [comic, setComic] = useState<Comic | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchComicDetail = async () => {
      setLoading(true);
      try {
        const [comicData, chaptersData, catsRes] = await Promise.all([
          fetchStoryById(comicId).catch(() => null),
          fetchChaptersByStoryId(comicId).catch(() => []),
          apiClient.get<any>("/api/categories").catch(() => []),
        ]);

        if (comicData) {
          setComic(comicData as any);
        }

        const sortedChapters = (chaptersData || []).sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );
        setChapters(sortedChapters);

        if (Array.isArray(catsRes) && catsRes.length > 0) {
          setCategories(catsRes);
        } else if (supabase) {
          const { data } = await supabase.from("categories").select("*");
          if (data) setCategories(data as Category[]);
        }
      } catch (error) {
        console.error("Lỗi tải chi tiết truyện:", error);
        toast.error("Không thể tải thông tin truyện.");
      } finally {
        setLoading(false);
      }
    };

    if (comicId) fetchComicDetail();
  }, [comicId]);

  useEffect(() => {
    getReadingHistory()
      .then((history) => {
        const read = history
          .filter((h) => h.comicId === comicId)
          .map((h) => h.chapterNumber);
        if (read.length) setReadChapters(new Set(read));
      })
      .catch(() => {});
  }, [comicId]);

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
