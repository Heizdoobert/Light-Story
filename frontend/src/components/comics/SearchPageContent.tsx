"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, SearchX, X } from "lucide-react";
import { Header } from "@/components/navigation/Header";
import LoginModal from "@/components/auth/login-modal";
import { FilterMenu } from "@/components/comics/FilterMenu";
import { SortDropdown } from "@/components/comics/SortDropdown";
import { Pagination } from "@/components/navigation/Pagination";
import { getStatusStyles } from "@/lib/utils/status-styles";
import { useSearchPresenter } from "@/hooks/presenters/useSearchPresenter";

export const SearchPageContent: React.FC = () => {
  const {
    t,
    keyword,
    category,
    currentPage,
    comics,
    loading,
    totalPages,
    totalItems,
    isLoginModalOpen,
    setIsLoginModalOpen,
    showFilter,
    setShowFilter,
    applyComicCoverFallback,
    getVietnameseStatus,
  } = useSearchPresenter();

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 pb-20">
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 z-70 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
                    L
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                    {t("filter_menu_title")}
                  </span>
                </div>
                <button
                  onClick={() => setShowFilter(false)}
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

      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
        <div className="mb-8 pt-4 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
              Danh sách truyện
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-slate-500 dark:text-slate-400">
              {keyword && (
                <span>
                  Từ khóa: <strong className="text-primary">"{keyword}"</strong>
                </span>
              )}
              {category !== "all" && (
                <span>
                  • Thể loại:{" "}
                  <strong className="text-primary">{category}</strong>
                </span>
              )}
              <span className="ml-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                {totalItems} kết quả
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 mt-2 sm:mt-0 flex items-center gap-2">
            <button
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-orange-500 dark:hover:border-[#001eff] hover:text-orange-500 dark:hover:text-[#39ff14] transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Bộ lọc
            </button>
            <SortDropdown />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 justify-items-center">
            {Array.from({ length: 14 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-100 dark:border-slate-800 w-full max-w-[180px]"
              >
                <div className="rounded-xl aspect-[3/4] bg-slate-200 dark:bg-slate-800 mb-2" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4 mb-1.5" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : comics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 sm:p-24 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center"
          >
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500">
              <SearchX size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              Không tìm thấy kết quả
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-md text-sm sm:text-base">
              Không tìm thấy bộ truyện nào khớp với bộ lọc của bạn. Hãy thử thay đổi từ khóa hoặc thể loại.
            </p>
            <Link
              href="/search"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:opacity-90 transition-opacity"
            >
              Đặt lại bộ lọc
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 justify-items-center">
              {comics.map((comic, i) => (
                <Link
                  key={comic.id}
                  href={`/comics/${comic.id}`}
                  className="block outline-none cursor-pointer w-full max-w-[180px]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-xs hover:shadow-2xl hover:shadow-primary/15 hover:-translate-y-1.5 transition-all duration-300 border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="relative overflow-hidden rounded-xl mb-2 aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                      <img
                        src={comic.coverUrl || "https://placehold.co/400x600/png?text=No+Cover"}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={applyComicCoverFallback}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                        <span className="text-white text-[11px] font-bold flex items-center gap-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <ImageIcon size={13} /> Đọc ngay
                        </span>
                      </div>
                      <div className="absolute top-1.5 right-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase shadow-xs backdrop-blur-md ${getStatusStyles(comic.status)}`}
                        >
                          {getVietnameseStatus(comic.status)}
                        </span>
                      </div>
                    </div>
                    <div className="px-0.5 pb-0.5 flex flex-col flex-1">
                      <h2 className="text-xs font-black mb-0.5 text-slate-900 dark:text-white whitespace-normal break-words [overflow-wrap:anywhere] leading-snug group-hover:text-primary transition-colors">
                        {comic.title}
                      </h2>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {comic.author || "Đang cập nhật"}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
