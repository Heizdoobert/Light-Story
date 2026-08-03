"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { Chapter } from "@/types/entities";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { saveReadingProgress } from "@/actions/reading-history.actions";
import { isCbzUrl, loadCbzPagesFromUrl } from "@/lib/cbz/cbzReader";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { decryptFieldClient } from "@/lib/security/encryption";

const USE_MOCK_DATA = false;

const MOCK_COMIC: Comic = {
  id: "comic-123",
  tenantKey: "tenant-1",
  storyId: "story-1",
  slug: "solo-leveling",
  description: "Mock description",
  category: ["Hành động", "Fantasy"],
  title: "Solo Leveling - Thăng Cấp Một Mình",
  author: "Chu-Gong",
  coverUrl: "https://placehold.co/400x600/png?text=Solo+Leveling",
  status: "ongoing",
  viewCount: 150000,
};

const MOCK_CHAPTERS: Chapter[] = [
  {
    id: "chap-1",
    story_id: "comic-123",
    chapter_number: 1,
    title: "Sự khởi đầu",
    content: "",
    status: "published",
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "chap-2",
    story_id: "comic-123",
    chapter_number: 2,
    title: "Hầm ngục kép",
    content: "",
    status: "published",
    created_at: "2026-06-08T10:00:00Z",
  },
];

const MOCK_IMAGES = [
  "https://placehold.co/800x1200/222/FFF/png?text=Trang+Truyện+1",
  "https://placehold.co/800x1200/333/FFF/png?text=Trang+Truyện+2",
];

export function useReadChapterPresenter() {
  const params = useParams();
  const router = useRouter();

  const comicId = params.comicId as string;
  const chapterId = params.chapterId as string;

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [fitScreen, setFitScreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const restoreDoneRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const nextChapterRef = useRef<Chapter | null>(null);
  const prevChapterRef = useRef<Chapter | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const target = dx > 0 ? prevChapterRef.current : nextChapterRef.current;
    if (target) router.push(`/comics/${comicId}/chapter/${target.id}`);
  }, [comicId, router]);

  const { data, isLoading } = useQuery<{
    comic: Comic | null;
    chapters: Chapter[];
    currentChapter: Chapter | null;
    images: string[];
  }>({
    queryKey: ["reader", comicId, chapterId],
    queryFn: async () => {
      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const foundChap =
            MOCK_CHAPTERS.find((c) => c.id === chapterId) || MOCK_CHAPTERS[0];
          return {
            comic: MOCK_COMIC,
            chapters: MOCK_CHAPTERS,
            currentChapter: foundChap,
            images: MOCK_IMAGES,
          };
        }

        const comicRes = await apiClient
          .get<any>(`/api/comics/${comicId}`)
          .catch(() => null);
        const comic = comicRes
          ? Array.isArray(comicRes)
            ? comicRes[0]
            : comicRes?.comic || comicRes
          : null;

        const chaptersRes = await apiClient
          .get<any>(`/api/comics/${comicId}/chapters`)
          .catch(() => []);
        const chaptersData: Chapter[] = Array.isArray(chaptersRes)
          ? chaptersRes
          : chaptersRes?.items || chaptersRes?.chapters || [];

        const sortedChapters = chaptersData.sort((a, b) => {
          if (a.chapter_number && b.chapter_number)
            return a.chapter_number - b.chapter_number;
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        });

        const currentRes = await apiClient.get<any>(
          `/api/comics/${comicId}/chapters/${chapterId}`,
        );
        const currentChapter = Array.isArray(currentRes)
          ? currentRes[0]
          : currentRes?.chapter || currentRes;
        if (currentChapter) {
          saveReadingProgress({ comicId: comicId, chapterId: chapterId, chapterNumber: currentChapter.chapter_number || 1 });
        }

        let imgArray: string[] = [];
        if (currentChapter?.content) {
          const rawText = typeof currentChapter.content === "string"
            ? await decryptFieldClient(currentChapter.content)
            : currentChapter.content;

          if (typeof rawText === "string") {
            try {
              imgArray = JSON.parse(rawText);
            } catch {
              imgArray = rawText
                .split(",")
                .map((s: string) => s.trim());
            }
          } else if (Array.isArray(rawText)) {
            imgArray = rawText;
          }
        }

        const cbzTargetUrl =
          imgArray.find((item) => typeof item === "string" && isCbzUrl(item)) ||
          (typeof currentChapter?.content === "string" && isCbzUrl(currentChapter.content)
            ? currentChapter.content
            : null);

        let images: string[];
        if (cbzTargetUrl) {
          try {
            toast.info("Đang giải nén tập tin .cbz...");
            const proxiedUrl = proxiedR2ImageUrl(cbzTargetUrl);
            images = await loadCbzPagesFromUrl(proxiedUrl);
          } catch (err) {
            console.error("[ReadChapterPage] Failed to load CBZ chapter", err);
            toast.error("Không thể giải nén file .cbz của chương truyện.");
            images = imgArray.map((url) => proxiedR2ImageUrl(url));
          }
        } else {
          images = imgArray.map((url) => proxiedR2ImageUrl(url));
        }

        return {
          comic,
          chapters: sortedChapters,
          currentChapter,
          images,
        };
      } catch (error) {
        toast.error("Không thể tải nội dung chương truyện.");
        throw error;
      }
    },
    enabled: !!(comicId && chapterId),
    refetchOnWindowFocus: false,
  });

  const comic = data?.comic ?? null;
  const currentChapter = data?.currentChapter ?? null;
  const allChapters = data?.chapters ?? [];
  const images = data?.images ?? [];
  const loading = isLoading || !comicId || !chapterId;

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      setProgress(docHeight > winHeight ? Math.min((currentScrollY + winHeight) / docHeight * 100, 100) : 100);
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowToolbar(false);
        setShowChapterMenu(false);
      } else {
        setShowToolbar(true);
      }
      setLastScrollY(currentScrollY);

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(`reader:scroll:${chapterId}`, String(currentScrollY)); } catch {}
      }, 500);

      if (autoAdvanceRef.current && nextChapterRef.current) {
        const docHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        if (docHeight - (currentScrollY + windowHeight) < 400) {
          router.push(
            `/comics/${comicId}/chapter/${nextChapterRef.current.id}`,
          );
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, comicId, chapterId, router]);

  useEffect(() => {
    if (!loading && images.length > 0 && !restoreDoneRef.current) {
      restoreDoneRef.current = true;
      try {
        const saved = localStorage.getItem(`reader:scroll:${chapterId}`);
        if (saved) {
          const y = parseInt(saved, 10);
          if (!isNaN(y)) requestAnimationFrame(() => window.scrollTo(0, y));
        }
      } catch {}
    }
  }, [loading, images, chapterId]);

  useEffect(() => {
    if (images.length === 0) return;
    const preloadCount = Math.min(3, images.length);
    const idx = 0;
    for (let i = idx; i < idx + preloadCount && i < images.length; i++) {
      const img = new Image();
      img.src = images[i];
    }
  }, [images]);

  const handleSelectChapter = (selectedId: string) => {
    setShowChapterMenu(false);
    if (selectedId) router.push(`/comics/${comicId}/chapter/${selectedId}`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToPage = (idx: number) => {
    setShowThumbnails(false);
    document.getElementById(`page-${idx}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDownload = async () => {
    if (downloading || images.length === 0) return;
    setDownloading(true);
    try {
      const cache = await caches.open("reader-pages");
      const cached = new Set<string>();
      const toCache = images.filter(u => !cached.has(u));
      if (toCache.length === 0) { toast.info("Đã lưu offline."); return; }
      let ok = 0, fail = 0;
      for (const url of toCache) {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (res.ok) { await cache.put(url, res); cached.add(url); ok++; }
          else fail++;
        } catch { fail++; }
      }
      toast.success(`Đã lưu ${ok}/${images.length} trang offline.`);
    } catch { toast.error("Lỗi lưu offline."); }
    finally { setDownloading(false); }
  };

  const foundIdx = allChapters.findIndex(
    (c) => c.id === (USE_MOCK_DATA ? currentChapter?.id : chapterId),
  );
  const currentIndex = foundIdx >= 0 ? foundIdx : 0;
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;
  nextChapterRef.current = nextChapter;
  prevChapterRef.current = prevChapter;

  return {
    comicId,
    chapterId,
    comic,
    currentChapter,
    allChapters,
    images,
    loading,
    isLoginModalOpen,
    setIsLoginModalOpen,
    showToolbar,
    setShowToolbar,
    showChapterMenu,
    setShowChapterMenu,
    autoAdvance,
    setAutoAdvance,
    fitScreen,
    setFitScreen,
    showThumbnails,
    setShowThumbnails,
    downloading,
    progress,
    theme,
    toggleTheme,
    handleTouchStart,
    handleTouchEnd,
    handleSelectChapter,
    scrollToTop,
    scrollToPage,
    handleDownload,
    prevChapter,
    nextChapter,
  };
}
