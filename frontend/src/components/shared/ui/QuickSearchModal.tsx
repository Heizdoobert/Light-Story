"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { ROUTES } from "@/lib/constants/routes";
import { Story } from "@/types/entities";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const QuickSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchStoriesPage({ keyword: trimmed, page: 1, pageSize: 7, sort: "newest" }).catch(() => null);
        setResults(res?.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const focusable = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (keyword.trim()) {
      router.push(`${ROUTES.SEARCH}?keyword=${encodeURIComponent(keyword.trim())}`);
    } else {
      router.push(ROUTES.SEARCH);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            aria-hidden="true"
          />
          <motion.div
            key="quick-search-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("quick_search_title")}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            onKeyDown={handleKeyDown}
            className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[110]"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t("quick_search_placeholder")}
                    aria-label={t("quick_search_placeholder")}
                    className="w-full pl-12 pr-12 py-4 text-base font-semibold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("close")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>

              <div className="border-t border-slate-100 dark:border-slate-800 max-h-[50vh] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-orange-500" aria-hidden="true" />
                    <span>{t("searching")}</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400" role="status">
                    {keyword.trim() ? t("quick_search_no_results") : t("quick_search_placeholder")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800" role="listbox" aria-label={t("quick_search_title")}>
                    {results.map((comic) => (
                      <button
                        key={comic.id}
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          router.push(ROUTES.COMIC_DETAIL(comic.id));
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <img
                          src={proxiedR2ImageUrl(comic.cover_url || "") || "https://placehold.co/400x600/png?text=No+Cover"}
                          alt={comic.title}
                          width={40}
                          height={56}
                          loading="lazy"
                          className="w-10 h-14 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400x600/png?text=No+Cover";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                            {comic.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {comic.author || t("updating")}
                          </p>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={handleSubmit}
                      className="block w-full p-3 text-center text-sm font-bold text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t("quick_search_see_all")} &quot;{keyword}&quot; »
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
