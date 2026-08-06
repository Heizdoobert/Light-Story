"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { Chapter } from "@/types/entities";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { saveReadingProgress } from "@/actions/reading-history.actions";
import { isCbzUrl, loadCbzPagesFromUrl } from "@/lib/cbz/cbz-reader";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { decryptFieldClient } from "@/lib/security/encryption";

import { fetchStoryById } from "@/services/comics/story.service";
import { fetchChaptersByStoryId } from "@/services/comics/chapter.service";
import { supabase } from "@/lib/supabase/client";

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

  const [comic, setComic] = useState<Comic | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [fitScreen, setFitScreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readingMode, setReadingMode] = useState<'webtoon' | 'single' | 'double'>('webtoon');
  const [brightness, setBrightness] = useState(100);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(0);
  const autoScrollSpeedRef = useRef<number>(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    autoScrollSpeedRef.current = autoScrollSpeed;
  }, [autoScrollSpeed]);

  useEffect(() => {
    let animId: number;
    const scrollStep = () => {
      if (autoScrollSpeedRef.current > 0) {
        window.scrollBy(0, autoScrollSpeedRef.current * 0.75);
      }
      animId = requestAnimationFrame(scrollStep);
    };
    if (autoScrollSpeed > 0) {
      animId = requestAnimationFrame(scrollStep);
    }
    return () => cancelAnimationFrame(animId);
  }, [autoScrollSpeed]);

  useEffect(() => {
    try {
      const mode = localStorage.getItem('reader:readingMode');
      if (mode && ['webtoon', 'single', 'double'].includes(mode)) setReadingMode(mode as any);
      const b = localStorage.getItem('reader:brightness');
      if (b && !isNaN(Number(b))) setBrightness(Number(b));
    } catch {}
  }, []);

  const changeReadingMode = (mode: 'webtoon' | 'single' | 'double') => {
    setReadingMode(mode);
    try { localStorage.setItem('reader:readingMode', mode); } catch {}
  };

  const changeBrightness = (val: number) => {
    const clamped = Math.max(40, Math.min(100, val));
    setBrightness(clamped);
    try { localStorage.setItem('reader:brightness', String(clamped)); } catch {}
  };

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

  useEffect(() => {
    const fetchReadingData = async () => {
      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setComic(MOCK_COMIC);
          setAllChapters(MOCK_CHAPTERS);
          const foundChap =
            MOCK_CHAPTERS.find((c) => c.id === chapterId) || MOCK_CHAPTERS[0];
          setCurrentChapter(foundChap);
          setImages(MOCK_IMAGES);
          return;
        }

        const [comicData, chaptersData] = await Promise.all([
          fetchStoryById(comicId).catch(() => null),
          fetchChaptersByStoryId(comicId).catch(() => []),
        ]);
        if (comicData) setComic(comicData as any);

        const sortedChapters = (chaptersData || []).sort((a, b) => {
          if (a.chapter_number && b.chapter_number)
            return a.chapter_number - b.chapter_number;
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        });
        setAllChapters(sortedChapters);

        let currentData: Chapter | null = null;
        try {
          const currentRes = await apiClient.get<any>(
            `/api/comics/${comicId}/chapters/${chapterId}`,
          ).catch(() => null);
          if (currentRes) {
            currentData = Array.isArray(currentRes)
              ? currentRes[0]
              : currentRes?.chapter || currentRes;
          }
        } catch {}

        if (!currentData) {
          currentData = sortedChapters.find((ch) => ch.id === chapterId) || null;
        }

        if (!currentData && supabase) {
          try {
            const { data } = await supabase
              .from("chapters")
              .select("*")
              .eq("id", chapterId)
              .maybeSingle();
            if (data) currentData = data as Chapter;
          } catch {}
        }

        setCurrentChapter(currentData);
        if (currentData) {
          saveReadingProgress({ comicId: comicId, chapterId: chapterId, chapterNumber: currentData.chapter_number || 1 });
        }

        let imgArray: string[] = [];
        if (currentData?.content) {
          const rawText = typeof currentData.content === "string"
            ? await decryptFieldClient(currentData.content)
            : currentData.content;

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
          (typeof currentData?.content === "string" && isCbzUrl(currentData.content)
            ? currentData.content
            : null);

        if (cbzTargetUrl) {
          try {
            toast.info("Đang giải nén tập tin .cbz...");
            const proxiedUrl = proxiedR2ImageUrl(cbzTargetUrl);
            const unpackedBlobUrls = await loadCbzPagesFromUrl(proxiedUrl);
            setImages(unpackedBlobUrls);
          } catch (err) {
            console.error("[ReadChapterPage] Failed to load CBZ chapter", err);
            toast.error("Không thể giải nén file .cbz của chương truyện.");
            setImages(imgArray.map((url) => proxiedR2ImageUrl(url)));
          }
        } else {
          setImages(imgArray.map((url) => proxiedR2ImageUrl(url)));
        }
      } catch (error) {
        toast.error("Không thể tải nội dung chương truyện.");
      } finally {
        setLoading(false);
      }
    };

    if (comicId && chapterId) fetchReadingData();
  }, [comicId, chapterId]);

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
          router.push(ROUTES.CHAPTER_READER(comicId, nextChapterRef.current.id));
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
    if (selectedId) router.push(ROUTES.CHAPTER_READER(comicId, selectedId));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToPage = (idx: number) => {
    setCurrentPageIndex(idx);
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
    readingMode,
    changeReadingMode,
    brightness,
    changeBrightness,
    currentPageIndex,
    autoScrollSpeed,
    setAutoScrollSpeed,
    prevChapter,
    nextChapter,
  };
}
