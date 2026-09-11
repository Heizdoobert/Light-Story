"use client";

import React from "react";
import { Bookmark, Sparkles, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useBookmarks } from "@/hooks/features/useBookmarks";
import { fetchStoriesByIds } from "@/services/comics/story.service";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getStatusStyles, getVietnameseStatus } from "@/lib/utils/status-styles";
import { useLanguage } from "@/context/LanguageContext";
import { applyComicCoverFallback } from "@/lib/utils/image-url";

export const UserBookmarksPageContent: React.FC = () => {
  const { t } = useLanguage();
  const { bookmarks, isLoading: isLoadingBookmarks, removeBookmark } = useBookmarks();

  const { data: stories = [], isLoading: isLoadingStories, isError } = useQuery({
    queryKey: ["bookmarks-stories", bookmarks],
    queryFn: () => fetchStoriesByIds(bookmarks),
    enabled: bookmarks.length > 0,
    staleTime: 60_000,
  });

  const isLoading = isLoadingBookmarks || isLoadingStories;

  const header = (
    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
      <Bookmark className="text-primary fill-primary/20" size={24} />
      {t("bookmarks_title")}{!isLoading && bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
    </h1>
  );

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    );
  } else if (isError) {
    content = (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={36} />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("error")}</h3>
      </div>
    );
  } else if (bookmarks.length === 0) {
    content = (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <Sparkles className="mx-auto text-amber-400 mb-3" size={36} />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("bookmarks_empty_title")}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          {t("bookmarks_empty_description")}
        </p>
        <Link
          href={ROUTES.COMICS}
          className="inline-block mt-5 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md hover:bg-primary/90 transition-all"
        >
          {t("bookmarks_empty_cta")}
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {stories.map((comic) => (
          <div
            key={comic.id}
            className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-primary/50 flex flex-col"
          >
            <Link href={ROUTES.COMIC_DETAIL(comic.id)} className="block relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={proxiedR2ImageUrl(comic.cover_url || "") || "https://placehold.co/400x600/png?text=No+Cover"}
                alt={comic.title}
                width={300}
                height={400}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                onError={applyComicCoverFallback}
              />
              <div className="absolute top-1.5 right-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase shadow-xs backdrop-blur-md ${getStatusStyles(comic.status)}`}
                >
                  {getVietnameseStatus(comic.status)}
                </span>
              </div>
            </Link>
            <div className="p-3 flex flex-col flex-1 justify-between">
              <Link href={ROUTES.COMIC_DETAIL(comic.id)}>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {comic.title}
                </h3>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {comic.author || t("updating")}
                </p>
              </Link>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">{t("bookmarks_following")}</span>
                <button
                  onClick={() => removeBookmark(comic.id)}
                  aria-label={`${t("bookmarks_unfollow")} ${comic.title}`}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  {t("bookmarks_unfollow")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      {header}
      {content}
    </div>
  );
};
