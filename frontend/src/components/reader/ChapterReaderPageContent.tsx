"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  List,
  ArrowUp,
  Play,
  Square,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { Header } from "@/components/navigation/Header";
import LoginModal from "@/components/auth/login-modal";
import { ChapterImage } from "@/components/reader/ChapterImage";
import { AdRenderer } from "@/components/reader/AdRenderer";
import { useReadChapterPresenter } from "@/hooks/presenters/useReadChapterPresenter";

export const ChapterReaderPageContent: React.FC = () => {
  const {
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
  } = useReadChapterPresenter();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#111] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const chapterNavClass = (chapter: typeof prevChapter) =>
    `flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 rounded-xl font-bold text-xs sm:text-base transition-all flex-1 border ${
      chapter
        ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary"
        : "border-transparent bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-600 pointer-events-none"
    }`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#111] transition-colors flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <Header onLoginClick={() => setIsLoginModalOpen(true)} />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
        <div className="h-1 bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
      </div>

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

        <AdRenderer position="header" />
      </div>

      <div
        className={`w-full mx-auto bg-white dark:bg-black flex-1 flex flex-col items-center min-h-[60vh] transition-colors shadow-sm touch-pan-y ${fitScreen ? "max-w-full" : "max-w-[800px]"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowToolbar(!showToolbar)}
      >
        {images.length === 0 ? (
          <div className="py-20 text-slate-400 dark:text-zinc-500 font-medium">
            Chương này chưa có nội dung (ảnh).
          </div>
        ) : (
          images.map((imgUrl, idx) => (
            <React.Fragment key={`${imgUrl}-${idx}`}>
              <div id={`page-${idx}`}>
                <ChapterImage
                  src={imgUrl}
                  alt={`Trang ${idx + 1}`}
                  index={idx}
                  fitScreen={fitScreen}
                />
              </div>
              {(idx + 1) % 4 === 0 && idx < images.length - 1 && (
                <AdRenderer position="middle" />
              )}
            </React.Fragment>
          ))
        )}
      </div>

      <div className="w-full max-w-[800px] mx-auto px-2 sm:px-4 mt-2">
        <AdRenderer position="sidebar" />
      </div>

      <div className="w-full max-w-[800px] mx-auto px-2 sm:px-4 py-6 sm:py-8 flex items-center justify-between gap-3 sm:gap-4 border-t border-slate-200 dark:border-white/5 mt-4">
        <Link
          href={
            prevChapter ? `/comics/${comicId}/chapter/${prevChapter.id}` : "#"
          }
          className={chapterNavClass(prevChapter)}
        >
          <ChevronLeft size={18} />{" "}
          <span className="line-clamp-1">Chương trước</span>
        </Link>
        <Link
          href={
            nextChapter ? `/comics/${comicId}/chapter/${nextChapter.id}` : "#"
          }
          className={chapterNavClass(nextChapter)}
        >
          <span className="line-clamp-1">Chương sau</span>{" "}
          <ChevronRight size={18} />
        </Link>
      </div>

      {showThumbnails && (
        <div className="fixed bottom-16 left-0 right-0 z-[65] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-2 py-2">
          <div className="max-w-[700px] mx-auto flex gap-2 overflow-x-auto pb-1">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => scrollToPage(idx)}
                className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary dark:hover:border-primary transition-colors"
              >
                <img
                  src={imgUrl}
                  alt={`Trang ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] pointer-events-none transition-transform duration-300 ease-in-out ${
          showToolbar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 sm:py-2.5 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.08)] dark:shadow-2xl transition-colors">
          <div className="max-w-[700px] mx-auto flex items-center justify-between gap-2">
            <Link
              href="/"
              className="p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
              title="Trang chủ"
            >
              <Home size={18} />
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
              title={theme === "dark" ? "Sáng" : "Tối"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href={
                prevChapter
                  ? `/comics/${comicId}/chapter/${prevChapter.id}`
                  : "#"
              }
              className={
                `flex items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ` +
                (prevChapter
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-700 pointer-events-none")
              }
              title="Chương trước"
            >
              <ChevronLeft size={18} />
            </Link>

            <div className="flex-1 relative max-w-[280px] sm:max-w-[380px]">
              <button
                onClick={() => setShowChapterMenu(!showChapterMenu)}
                className="w-full flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-extrabold rounded-xl px-3.5 py-2 transition-all text-xs sm:text-sm shadow-md shadow-blue-500/25 dark:shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
              >
                <span className="truncate tracking-wide">
                  {currentChapter?.chapter_number
                    ? `Chương ${currentChapter.chapter_number}`
                    : currentChapter?.title || "Chọn chương"}
                </span>
                <List size={16} className="text-white/90 flex-shrink-0" />
              </button>

              {showChapterMenu && (
                <div className="absolute bottom-full mb-3 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto z-[70] p-1.5 transition-colors">
                  {allChapters.map((chap) => (
                    <button
                      key={chap.id}
                      onClick={() => handleSelectChapter(chap.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        chapterId === chap.id
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
              className={
                `flex items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ` +
                (nextChapter
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-700 pointer-events-none")
              }
              title="Chương sau"
            >
              <ChevronRight size={18} />
            </Link>

            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                showThumbnails
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title="Xem ảnh nhỏ"
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0 disabled:opacity-40"
              title={downloading ? "Đang lưu..." : "Lưu offline"}
            >
              <Download size={18} />
            </button>

            <button
              onClick={() => setFitScreen(!fitScreen)}
              className={`p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                fitScreen
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title={fitScreen ? "Vừa khung hình" : "Vừa chiều rộng"}
            >
              {fitScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`p-2.5 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                autoAdvance
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title={autoAdvance ? "Tắt tự động" : "Tự động chuyển chương"}
            >
              {autoAdvance ? <Play size={18} /> : <Square size={18} />}
            </button>

            <button
              onClick={scrollToTop}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-shrink-0"
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
};
