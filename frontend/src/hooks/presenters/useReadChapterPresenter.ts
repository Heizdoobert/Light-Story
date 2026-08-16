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
import { loadCbzPagesFromUrl } from "@/lib/cbz/cbz-reader";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { decryptFieldClient } from "@/lib/security/encryption";
import { parseChapterContent } from "@/lib/r2/chapter-content";

import { fetchStoryById } from "@/services/comics/story.service";
import { fetchChaptersByStoryId } from "@/services/comics/chapter.service";
import { supabase } from "@/lib/supabase/client";

export interface ReaderChapterListItem {
  id: string;
  chapter_number?: number;
  title?: string;
  created_at?: string;
}

export interface ReaderInitialData {
  comic: Comic | null;
  allChapters: ReaderChapterListItem[];
  currentChapter: Chapter | null;
  images: string[];
  requiresCbzUnpack: boolean;
}

export function useReadChapterPresenter(initialData?: ReaderInitialData | null) {
  const params = useParams();
  const router = useRouter();

  const comicId = params.comicId as string;
  const chapterId = params.chapterId as string;

  const [comic, setComic] = useState<Comic | null>(initialData?.comic ?? null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(initialData?.currentChapter ?? null);
  const [allChapters, setAllChapters] = useState<ReaderChapterListItem[]>(initialData?.allChapters ?? []);
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [loading, setLoading] = useState(false);

  const [reseededChapterId, setReseededChapterId] = useState<string | null>(
    initialData?.currentChapter?.id ?? null,
  );

  // Render-phase reseed: RSC navigation delivers new initialData; sync state
  // during render (React derived-state pattern) so no spinner ever paints.
  if (initialData && initialData.currentChapter?.id !== reseededChapterId) {
    setReseededChapterId(initialData.currentChapter?.id ?? null);
    setComic(initialData.comic);
    setCurrentChapter(initialData.currentChapter);
    setAllChapters(initialData.allChapters);
    setImages(initialData.images);
    setLoading(false);
  }


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
  const nextChapterRef = useRef<ReaderChapterListItem | null>(null);
  const prevChapterRef = useRef<ReaderChapterListItem | null>(null);
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
    // RSC is the source of truth when initialData is present; fetch only when
    // the server failed entirely (no initialData) to preserve client recovery.
    if (initialData) return;

    setLoading(true);
    const fetchReadingData = async () => {
      try {
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

        let imgArray: string[] = [];
        if (currentData?.content) {
          const rawText =
            typeof currentData.content === "string" &&
            currentData.content.startsWith("ENCv1:")
              ? await decryptFieldClient(currentData.content)
              : currentData.content;

          const parsed = parseChapterContent(rawText);
          imgArray = parsed.imageUrls;

          if (parsed.isCbz && parsed.cbzUrl) {
            try {
              toast.info("Đang giải nén tập tin .cbz...");
              const proxiedUrl = proxiedR2ImageUrl(parsed.cbzUrl);
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
        }
      } catch {
        toast.error("Không thể tải nội dung chương truyện.");
      } finally {
        setLoading(false);
      }
    };

    if (comicId && chapterId) fetchReadingData();
  }, [comicId, chapterId, initialData]);

  // Reading progress must persist on both the SSR-seeded and client-fetch paths.
  useEffect(() => {
    if (currentChapter && comicId && chapterId) {
      saveReadingProgress({
        comicId,
        chapterId,
        chapterNumber: currentChapter.chapter_number || 1,
      });
    }
  }, [comicId, chapterId, currentChapter?.id]);

  // CBZ chapters can't be unpacked server-side (blob URLs); unpack on the client
  // only when SSR flagged requiresCbzUnpack, without refetching anything.
  useEffect(() => {
    if (!initialData?.requiresCbzUnpack) return;
    if (!currentChapter || images.length > 0) return;
    (async () => {
      try {
        const content =
          typeof currentChapter.content === "string" &&
          currentChapter.content.startsWith("ENCv1:")
            ? await decryptFieldClient(currentChapter.content)
            : currentChapter.content;
        const parsed = parseChapterContent(content);
        if (!parsed.cbzUrl) return;
        toast.info("Đang giải nén tập tin .cbz...");
        const proxiedUrl = proxiedR2ImageUrl(parsed.cbzUrl);
        const unpackedBlobUrls = await loadCbzPagesFromUrl(proxiedUrl);
        setImages(unpackedBlobUrls);
      } catch (err) {
        console.error("[ReadChapterPage] Failed to load CBZ chapter", err);
        toast.error("Không thể giải nén file .cbz của chương truyện.");
      }
    })();
  }, [currentChapter?.id, initialData]);

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
      let ok = 0;
      for (const url of toCache) {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (res.ok) { await cache.put(url, res); cached.add(url); ok++; }
        } catch { /* skip failed page */ }
      }
      toast.success(`Đã lưu ${ok}/${images.length} trang offline.`);
    } catch { toast.error("Lỗi lưu offline."); }
    finally { setDownloading(false); }
  };

  const foundIdx = allChapters.findIndex(
    (c) => c.id === chapterId,
  );
  const currentIndex = foundIdx >= 0 ? foundIdx : 0;
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  useEffect(() => {
    nextChapterRef.current = nextChapter;
    prevChapterRef.current = prevChapter;
  }, [nextChapter, prevChapter]);

  return {
    comicId,
    chapterId,
    comic,
    currentChapter,
    allChapters,
    images,
    loading,
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
