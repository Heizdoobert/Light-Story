"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  BookOpen,
  Clock,
  Flame,
  Play,
  Eye,
} from "lucide-react";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { AdRenderer } from "@/components/reader/AdRenderer";
import { useHomePagePresenter } from "@/hooks/presenters/useHomePagePresenter";
import { ROUTES } from "@/lib/constants/routes";

type HomePageProps = {
  initialComics?: Comic[];
  initialTrending?: Comic[];
  initialLatestChapters?: Record<string, import("@/types/entities").Chapter>;
  hydrated?: boolean;
};

function SectionHeader({
  icon: Icon,
  title,
  link,
  linkLabel,
}: {
  icon: React.ElementType;
  title: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 dark:from-[#001eff] dark:to-[#8900ff] text-white flex items-center justify-center shadow-sm">
          <Icon size={16} />
        </span>
        <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white tracking-tight">
          {title}
        </h2>
      </div>
      {link && (
        <Link
          href={link}
          className="flex items-center gap-0.5 text-xs font-bold text-orange-500 dark:text-accent hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export const HomePage: React.FC<HomePageProps> = ({
  initialComics = [],
  initialTrending = [],
  initialLatestChapters = {},
  hydrated = false,
}) => {
  const {
    t,
    comics,
    latestChapters,
    trendingComics,
    trendingLoaded,
    loading,
    historyComics,
    getComicCover,
    applyComicCoverFallback,
  } = useHomePagePresenter(initialComics, initialTrending, initialLatestChapters, hydrated);

  const spotlight = trendingComics[0];
  const restOfTrending = trendingComics.slice(1);

  const chapterLabel = (comic: Comic) =>
    latestChapters[comic.id]?.title ||
    `${t("chapter")} ${latestChapters[comic.id]?.chapter_number ?? 1}`;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-6">
      <h1 className="sr-only">{t("nav_home")}</h1>

      <AdRenderer position="header" />

      {/* HERO SPOTLIGHT */}
      {spotlight && (
        <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl shadow-orange-500/10 dark:shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-600 to-slate-950 dark:from-[#001eff] dark:via-[#8900ff] dark:to-slate-950" />
          <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-8 p-5 sm:p-8 items-center">
            <Link
              href={ROUTES.COMIC_DETAIL(spotlight.id)}
              className="relative w-36 sm:w-44 lg:w-52 shrink-0 rounded-2xl overflow-hidden border-4 border-white/20 dark:border-white/10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-300"
            >
              <img
                src={getComicCover(spotlight)}
                alt={spotlight.title}
                width={300}
                height={400}
                decoding="async"
                className="w-full aspect-[3/4] object-cover"
                referrerPolicy="no-referrer"
                onError={applyComicCoverFallback}
              />
            </Link>
            <div className="flex-1 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 dark:bg-white/10 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest mb-3">
                <Flame size={12} className="text-amber-300" />
                {t("popular_comics")}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2 mb-2 drop-shadow">
                {spotlight.title}
              </h2>
              <p className="text-white/80 text-sm font-medium mb-1 line-clamp-1">
                {spotlight.author || t("updating")}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-white/70 text-xs font-semibold mb-5">
                <span className="inline-flex items-center gap-1">
                  <Eye size={13} /> {(spotlight.viewCount || 0).toLocaleString()}
                </span>
                {spotlight.category?.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full bg-white/15 dark:bg-white/10 text-[10px] font-bold"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <Link
                  href={ROUTES.COMIC_DETAIL(spotlight.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-black shadow-lg hover:scale-105 transition-transform"
                >
                  <Play size={16} className="fill-current" />
                  {t("read_now")}
                </Link>
                <Link
                  href={ROUTES.SEARCH}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 dark:bg-white/10 backdrop-blur text-white text-sm font-bold hover:bg-white/25 transition-colors"
                >
                  {t("view_all_comics")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TRENDING STRIP */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <SectionHeader
          icon={TrendingUp}
          title={t("popular_comics")}
          link={`${ROUTES.SEARCH}?sort=most_viewed`}
          linkLabel={t("view_all_comics")}
        />
        {restOfTrending.length > 0 ? (
          <div className="px-3 sm:px-5 pb-4 flex overflow-x-auto gap-3 sm:gap-4 scroll-smooth no-scrollbar">
            {restOfTrending.map((comic) => (
              <Link
                key={`trending-${comic.id}`}
                href={ROUTES.COMIC_DETAIL(comic.id)}
                className="group relative w-32 sm:w-40 flex-shrink-0 outline-none block"
              >
                <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 group-hover:border-orange-500 dark:group-hover:border-accent transition-colors">
                  <img
                    src={getComicCover(comic)}
                    alt={comic.title}
                    width={300}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={applyComicCoverFallback}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5">
                    <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-accent transition-colors">
                      {comic.title}
                    </h3>
                    <p className="text-[10px] text-slate-300 truncate">
                      {chapterLabel(comic)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !trendingLoaded ? (
          <div className="px-3 sm:px-5 pb-4 flex overflow-x-auto gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="w-32 sm:w-40 flex-shrink-0">
                <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-4 flex items-center">
            <div className="aspect-[3/4] w-32 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-sm text-center px-2">
              {t("no_comics_yet")}
            </div>
          </div>
        )}
      </section>

      {/* CONTINUE READING */}
      {historyComics.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <SectionHeader icon={BookOpen} title={t("continue_reading")} />
          <div className="px-3 sm:px-5 pb-4 flex overflow-x-auto gap-3 sm:gap-4 scroll-smooth no-scrollbar">
            {historyComics.map((comic) => (
              <Link
                key={`history-${comic.id}`}
                href={ROUTES.CHAPTER_READER(comic.id, comic.chapterId ?? "")}
                className="group relative w-32 sm:w-40 flex-shrink-0 outline-none block"
              >
                <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 group-hover:border-orange-500 dark:group-hover:border-accent transition-colors">
                  <img
                    src={getComicCover(comic)}
                    alt={comic.title}
                    width={300}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={applyComicCoverFallback}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5">
                    <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-accent transition-colors">
                      {comic.title}
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      {t("chapter")} {comic.chapterNumber}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <AdRenderer position="middle" />

      {/* 2-COLUMN: NEW UPDATES + TOP READS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <main className="lg:col-span-3 space-y-4">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <SectionHeader
              icon={Clock}
              title={t("newly_updated_comics")}
              link={ROUTES.SEARCH}
              linkLabel={t("view_all_comics")}
            />
            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-8 h-8 border-4 border-orange-500/30 dark:border-accent/30 border-t-orange-500 dark:border-t-accent rounded-full animate-spin"></div>
              </div>
            ) : comics.length === 0 ? (
              <div className="text-center py-16 px-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                {t("no_comics_yet")}
              </div>
            ) : (
              <div className="px-3 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {comics.map((comic) => (
                  <div
                    key={comic.id}
                    className="flex gap-3 p-2.5 border border-slate-100 dark:border-white/10 rounded-xl hover:border-orange-500 dark:hover:border-accent hover:shadow-md transition-all dark:bg-slate-950/60"
                  >
                    <Link
                      href={ROUTES.COMIC_DETAIL(comic.id)}
                      className="relative w-20 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-black"
                    >
                      <img
                        src={getComicCover(comic)}
                        alt={comic.title}
                        width={300}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={applyComicCoverFallback}
                      />
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <Link
                          href={ROUTES.COMIC_DETAIL(comic.id)}
                          className="font-bold text-sm text-slate-800 dark:text-white hover:text-orange-500 dark:hover:text-accent transition-colors line-clamp-1"
                        >
                          {comic.title}
                        </Link>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {comic.author || t("updating")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg">
                        <span className="text-xs font-semibold text-orange-600 dark:text-accent truncate">
                          {chapterLabel(comic)}
                        </span>
                        {comic.updated_at && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {new Date(comic.updated_at).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="lg:col-span-1">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm lg:sticky lg:top-24">
            <SectionHeader icon={Flame} title={t("top_read_comics")} />
            <div className="divide-y divide-slate-100 dark:divide-white/10 min-h-[320px]">
              {(comics.length > 0 ? (trendingComics.length > 0 ? trendingComics : comics) : []).slice(0, 10).map((comic, idx) => (
                <Link
                  key={`top-${comic.id}`}
                  href={ROUTES.COMIC_DETAIL(comic.id)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#000b13] transition-colors group"
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0
                        ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white"
                        : idx === 1
                        ? "bg-gradient-to-br from-[#8900ff] to-[#001eff] text-white"
                        : idx === 2
                        ? "bg-gradient-to-br from-[#001eff] to-cyan-400 text-white"
                        : "bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="relative shrink-0 w-10 h-14 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black">
                    <img
                      src={getComicCover(comic)}
                      alt={comic.title}
                      width={300}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={applyComicCoverFallback}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-orange-500 dark:group-hover:text-accent transition-colors line-clamp-1">
                      {comic.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-orange-600 dark:text-accent truncate max-w-[80%]">
                        {chapterLabel(comic)}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 inline-flex items-center gap-0.5">
                        <Eye size={11} />
                        {(comic.viewCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
