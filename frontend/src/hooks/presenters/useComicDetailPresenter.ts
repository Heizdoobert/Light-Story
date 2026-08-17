"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { getReadingHistory } from "@/services/reader/readerHub.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";

import { fetchStoryById } from "@/services/comics/story.service";
import { fetchChaptersByStoryId } from "@/services/comics/chapter.service";
import { supabase } from "@/lib/supabase/client";
import { getVietnameseStatus } from "@/lib/utils/status-styles";

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
  const comicId = params.comicId as string;

  const [comic, setComic] = useState<Comic | null>(initialComic);
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(!hydrated);

  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (hydrated) return;
    const fetchComicDetail = async () => {
      setLoading(true);
      try {
        const [comicData, chaptersData] = await Promise.all([
          fetchStoryById(comicId).catch(() => null),
          fetchChaptersByStoryId(comicId).catch(() => []),
        ]);

        if (comicData) {
          setComic(comicData as any);
        }

        const sortedChapters = (chaptersData || []).sort(
          (a, b) => (a.chapter_number ?? 0) - (b.chapter_number ?? 0),
        );
        setChapters(sortedChapters);

        if (supabase) {
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
  }, [comicId, hydrated]);

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

  const rawCover = (comic as any)?.coverUrl || (comic as any)?.cover_url || "";
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
  };
}
