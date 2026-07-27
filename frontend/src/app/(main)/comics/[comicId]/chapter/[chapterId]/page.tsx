"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  List,
  ArrowUp,
  X,
} from "lucide-react";

import { apiClient } from "@/lib/api/apiClient";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { Chapter, Category } from "@/types/entities";
import { toast } from "sonner";
import { Header } from "@/components/shared/navigation/Header";
import { LoginModal } from "@/components/shared/auth/LoginModal";
import { FilterMenu } from "@/app/_components/FilterMenu";
import { recordReadingHistory } from "@/services/reader/readerHub.service";
import { ChapterImage } from "@/components/reader/ChapterImage";
import { AdZone } from "@/components/shared/ads/AdZone";
import { isCbzUrl, loadCbzPagesFromUrl } from "@/lib/cbz/cbzReader";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { decryptFieldClient } from "@/lib/security/encryption";
import { useLanguage } from "@/modules/language/LanguageContext";

// 🔴 BẬT/TẮT DỮ LIỆU GIẢ Ở ĐÂY
const USE_MOCK_DATA = false;

// --- BỘ DỮ LIỆU GIẢ LẬP (MOCK DATA) ---
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
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "chap-2",
    story_id: "comic-123",
    chapter_number: 2,
    title: "Hầm ngục kép",
    content: "",
    created_at: "2026-06-08T10:00:00Z",
  },
  {
    id: "chap-3",
    story_id: "comic-123",
    chapter_number: 3,
    title: "Thức tỉnh",
    content: "",
    created_at: "2026-06-15T10:00:00Z",
  },
  {
    id: "chap-4",
    story_id: "comic-123",
    chapter_number: 4,
    title: "Thợ săn hạng E",
    content: "",
    created_at: "2026-06-22T10:00:00Z",
  },
];

const MOCK_IMAGES = [
  "https://placehold.co/800x1200/222/FFF/png?text=Trang+Truyện+1\n\n(Giả+lập+chiều+dài+thực+tế)",
  "https://placehold.co/800x1200/333/FFF/png?text=Trang+Truyện+2",
  "https://placehold.co/800x1200/444/FFF/png?text=Trang+Truyện+3",
  "https://placehold.co/800x1200/555/FFF/png?text=Trang+Truyện+4",
  "https://placehold.co/800x1200/666/FFF/png?text=Trang+Truyện+5",
];
// ----------------------------------------

export default function ReadChapterPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const comicId = params.comicId as string;
  const chapterId = params.chapterId as string;
  const [_showFilter, setShowFilter] = useState(false);
  const [comic, setComic] = useState<Comic | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [_categories, setCategories] = useState<Category[]>([]); // Thêm state cho thể loại
  const [loading, setLoading] = useState(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Thêm state cho Sidebar Menu

  useEffect(() => {
    const fetchReadingData = async () => {
      try {
        // Tải thể loại cho FilterMenu
        const catsRes = await apiClient
          .get<any>("/api/categories")
          .catch(() => []);
        if (Array.isArray(catsRes)) setCategories(catsRes);

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

        const comicRes = await apiClient
          .get<any>(`/api/comics/${comicId}`)
          .catch(() => null);
        if (comicRes)
          setComic(
            Array.isArray(comicRes) ? comicRes[0] : comicRes?.comic || comicRes,
          );

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
        setAllChapters(sortedChapters);

        const currentRes = await apiClient.get<any>(
          `/api/comics/${comicId}/chapters/${chapterId}`,
        );
        const currentData = Array.isArray(currentRes)
          ? currentRes[0]
          : currentRes?.chapter || currentRes;
        setCurrentChapter(currentData);
        if (currentData) {
          recordReadingHistory(comicId, chapterId, currentData.chapter_number || 1);
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
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowToolbar(false);
        setShowChapterMenu(false);
      } else {
        setShowToolbar(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Khóa cuộn trang khi mở Sidebar
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showSidebar]);

  const handleSelectChapter = (selectedId: string) => {
    setShowChapterMenu(false);
    if (selectedId) router.push(`/comics/${comicId}/chapter/${selectedId}`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#111] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentIndex =
    allChapters.findIndex(
      (c) => c.id === (USE_MOCK_DATA ? currentChapter?.id : chapterId),
    ) !== -1
      ? allChapters.findIndex(
          (c) => c.id === (USE_MOCK_DATA ? currentChapter?.id : chapterId),
        )
      : 0;
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex !== -1 && currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#111] transition-colors flex flex-col">
      {/* SIDEBAR MENU (Mở khi bấm nút 3 gạch) */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 z-[101] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white font-black text-sm">
                    L
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                    {t("filter_menu_title")}
                  </span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <FilterMenu onClose={() => setShowFilter(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PHẦN 5: HEADER ĐẦU TRANG */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <Header
          onMenuClick={() => setShowSidebar(true)} // ĐÃ KẾT NỐI NÚT 3 GẠCH Ở ĐÂY
          onLoginClick={() => setIsLoginModalOpen(true)}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>

      {/* PHẦN 1: THÔNG TIN CƠ BẢN CỦA CHAPTER */}
      <div className="max-w-4xl mx-auto w-full px-4 py-8 text-center flex-shrink-0">
        <Link
          href={`/comics/${comicId}`}
          className="inline-block text-xl sm:text-2xl font-black text-slate-900 dark:text-white hover:text-primary transition-colors mb-2"
        >
          {comic?.title || "Tên Truyện Đang Cập Nhật"}
        </Link>
        <div className="text-slate-500 dark:text-zinc-400 font-medium text-sm sm:text-base">
          {currentChapter?.chapter_number
            ? `Chương ${currentChapter.chapter_number}`
            : "Chương ?"}
          {currentChapter?.title && ` - ${currentChapter.title}`}
        </div>
        
        {/* VÙNG QUẢNG CÁO ĐẦU TRANG ĐỌC (Leaderboard) */}
        <AdZone zoneId="reader-top" format="banner" className="mt-4" />
      </div>

      {/* PHẦN 2: CHỨA CÁC TRANG TRUYỆN */}
      <div className="w-full max-w-[800px] mx-auto bg-white dark:bg-black flex-1 flex flex-col items-center min-h-[60vh] transition-colors shadow-sm">
        {images.length === 0 ? (
          <div className="py-20 text-slate-400 dark:text-zinc-500 font-medium">
            Chương này chưa có nội dung (ảnh).
          </div>
        ) : (
          images.map((imgUrl, idx) => (
            <React.Fragment key={`${imgUrl}-${idx}`}>
              <ChapterImage
                src={imgUrl}
                alt={`Trang ${idx + 1}`}
                index={idx}
              />
              {/* VÙNG QUẢNG CÁO GIỮA CÁC TRANG (Chèn sau mỗi 4 trang) */}
              {(idx + 1) % 4 === 0 && idx < images.length - 1 && (
                <AdZone
                  zoneId={`reader-infeed-${Math.floor((idx + 1) / 4)}`}
                  format="in-feed"
                  className="my-2"
                />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* VÙNG QUẢNG CÁO CUỐI TRANG ĐỌC */}
      <div className="w-full max-w-[800px] mx-auto px-2 sm:px-4 mt-2">
        <AdZone zoneId="reader-bottom" format="banner" />
      </div>

      {/* KHU VỰC ĐIỀU HƯỚNG GIỮA TRANG (Đã thiết kế lại phong cách Outlined) */}
      <div className="w-full max-w-[800px] mx-auto px-2 sm:px-4 py-6 sm:py-8 flex items-center justify-between gap-3 sm:gap-4 border-t border-slate-200 dark:border-white/5 mt-4">
        <Link
          href={
            prevChapter ? `/comics/${comicId}/chapter/${prevChapter.id}` : "#"
          }
          className={`flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-base transition-all flex-1 border ${
            prevChapter
              ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary"
              : "border-transparent bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-600 pointer-events-none"
          }`}
        >
          <ChevronLeft size={18} />{" "}
          <span className="line-clamp-1">Chương trước</span>
        </Link>
        <Link
          href={
            nextChapter ? `/comics/${comicId}/chapter/${nextChapter.id}` : "#"
          }
          className={`flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-base transition-all flex-1 border ${
            nextChapter
              ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary"
              : "border-transparent bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-600 pointer-events-none"
          }`}
        >
          <span className="line-clamp-1">Chương sau</span>{" "}
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* PHẦN 4: TÁI SỬ DỤNG FOOTER */}

      {/* PHẦN 3: THANH CÔNG CỤ ĐỔI CHƯƠNG (Khớp màu hệ thống Light/Dark & Highlight Nút Chuyển Chương) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] pointer-events-none transition-transform duration-300 ease-in-out ${
          showToolbar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 sm:py-2.5 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl transition-colors">
          <div className="max-w-[700px] mx-auto flex items-center justify-between gap-2">
            <Link
              href="/"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
              title="Trang chủ"
            >
              <Home size={18} />
            </Link>

            <Link
              href={
                prevChapter
                  ? `/comics/${comicId}/chapter/${prevChapter.id}`
                  : "#"
              }
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all flex-shrink-0 ${
                prevChapter
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-700 pointer-events-none"
              }`}
              title="Chương trước"
            >
              <ChevronLeft size={18} />
            </Link>

            <div className="flex-1 relative max-w-[280px] sm:max-w-[380px]">
              {/* Highlight Button: Gradient + High contrast text + Glow */}
              <button
                onClick={() => setShowChapterMenu(!showChapterMenu)}
                className="w-full flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-extrabold rounded-xl px-3.5 py-2 transition-all text-xs sm:text-sm shadow-md shadow-blue-500/25 dark:shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
              >
                <span className="truncate tracking-wide">
                  {currentChapter?.chapter_number
                    ? `Chương ${currentChapter.chapter_number}`
                    : currentChapter?.title || "Chọn chương"}
                </span>
                <List
                  size={16}
                  className="text-white/90 flex-shrink-0"
                />
              </button>

              {/* Danh sách chương (Tương thích Light/Dark màu hệ thống) */}
              {showChapterMenu && (
                <div className="absolute bottom-full mb-3 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto z-[70] p-1.5 transition-colors">
                  {allChapters.map((chap) => (
                    <button
                      key={chap.id}
                      onClick={() => handleSelectChapter(chap.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        (USE_MOCK_DATA ? currentChapter?.id : chapterId) ===
                        chap.id
                          ? "text-blue-600 dark:text-blue-400 font-black bg-blue-50 dark:bg-blue-950/40"
                          : "text-slate-700 dark:text-slate-200 font-semibold"
                      }`}
                    >
                      {chap.chapter_number
                        ? `Chương ${chap.chapter_number}`
                        : chap.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={
                nextChapter
                  ? `/comics/${comicId}/chapter/${nextChapter.id}`
                  : "#"
              }
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all flex-shrink-0 ${
                nextChapter
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-700 pointer-events-none"
              }`}
              title="Chương sau"
            >
              <ChevronRight size={18} />
            </Link>

            <button
              onClick={scrollToTop}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>

      {showChapterMenu && (
        <div
          className="fixed inset-0 z-[55] bg-slate-900/20 dark:bg-black/50 backdrop-blur-[1px]"
          onClick={() => setShowChapterMenu(false)}
        />
      )}
    </div>
  );
}
