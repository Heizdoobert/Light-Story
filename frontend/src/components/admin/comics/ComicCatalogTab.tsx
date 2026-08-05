"use client";

import React from "react";
import { motion } from "motion/react";
import { Filter, PencilLine, Plus, RefreshCw, Search } from "lucide-react";
import { proxiedR2ImageUrl, type ComicCatalogFilters, type ComicCmsRecord } from "@/services/comics/comicCms.service";
import {
  type TabKey,
  formatDateTime,
  statusTone,
} from "@/lib/cms/comicCmsTypes";
import type { ComicStatus } from "@/lib/validation/comic-cms-schemas";

function StatusBadge({ status }: { status: ComicStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${statusTone(status)}`}
    >
      {status}
    </span>
  );
}

type ComicCatalogTabProps = {
  catalog: ComicCmsRecord[];
  selectedComic: ComicCmsRecord | null;
  filters: ComicCatalogFilters;
  refreshing: boolean;
  role?: string | null;
  currentUserId?: string | null;
  onFiltersChange: (filters: ComicCatalogFilters) => void;
  onRefresh: (showToast: boolean) => void;
  onNewDraft: () => void;
  onOpenComic: (comicId: string, tab?: TabKey) => void;
};

export function ComicCatalogTab({
  catalog,
  selectedComic,
  filters,
  refreshing,
  role = null,
  currentUserId = null,
  onFiltersChange,
  onRefresh,
  onNewDraft,
  onOpenComic,
}: ComicCatalogTabProps) {
  const [myComicsOnly, setMyComicsOnly] = React.useState(role === "employee");

  const sortedCatalog = React.useMemo(
    () =>
      [...catalog]
        .filter((record) => {
          if (myComicsOnly && currentUserId) {
            const isAssigned = (record as any).assignedTo === currentUserId || (record as any).created_by === currentUserId;
            if (!isAssigned) return false;
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            if (
              !record.title.toLowerCase().includes(q) &&
              !record.author.toLowerCase().includes(q)
            ) {
              return false;
            }
          }
          if (filters.status !== "all" && record.status !== filters.status) return false;
          if (filters.author && record.author !== filters.author) return false;
          return true;
        })
        .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt)),
    [catalog, filters, myComicsOnly, currentUserId],
  );

  const authorOptions = React.useMemo(
    () => [...new Set(catalog.map((record) => record.author).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [catalog],
  );

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur transition-all">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <Search size={14} className="text-cyan-500" />
            Comic Catalog
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search, filter, and tap any comic to immediately edit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMyComicsOnly(!myComicsOnly)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition border ${
              myComicsOnly
                ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800"
            }`}
          >
            {myComicsOnly ? "Truyện được phân công" : "Tất cả truyện hệ thống"}
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onRefresh(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onNewDraft}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-cyan-500 dark:to-cyan-400 px-4 py-2 text-sm font-bold text-white dark:text-slate-950 shadow-md"
          >
            <Plus size={14} /> New draft
          </motion.button>
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-inner">
            <Search size={16} className="text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder="Search comics..."
              className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filters.status}
              onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Author</div>
            <select
              value={filters.author}
              onChange={(event) => onFiltersChange({ ...filters, author: event.target.value })}
              className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">All authors</option>
              {authorOptions.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] min-w-0 w-full overflow-hidden">
          <div className="space-y-3 min-w-0 w-full">
            {sortedCatalog.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-10 text-center text-slate-500 dark:text-slate-400">
                No comics match the current filters.
              </div>
            ) : (
              sortedCatalog.map((comic) => (
                <motion.button
                  key={comic.id}
                  whileHover={{ y: -2, scale: 1.005 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenComic(comic.id, "editor")}
                  className={`w-full max-w-full min-w-0 rounded-3xl border px-5 py-4 text-left transition-all shadow-sm overflow-hidden ${
                    selectedComic?.id === comic.id
                      ? "border-cyan-500/80 bg-cyan-500/10 shadow-cyan-500/10 shadow-lg"
                      : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 hover:border-cyan-400/50 dark:hover:border-cyan-600/50"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <img
                        src={proxiedR2ImageUrl(comic.coverUrl) || "https://placehold.co/96x128/png?text=Comic"}
                        alt={comic.title}
                        className="h-20 w-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-md shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 dark:text-white break-words line-clamp-1">{comic.title}</h3>
                          <StatusBadge status={comic.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {comic.author}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 break-words">
                          {comic.description || "No description provided."}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div>
                        <div className="font-black text-slate-800 dark:text-slate-200 text-sm">{comic.chapters.length}</div>
                        chapters
                      </div>
                      <div>
                        <div className="font-black text-slate-800 dark:text-slate-200 text-sm">{comic.viewCount}</div>
                        views
                      </div>
                      <div className="col-span-2 text-[11px] text-slate-400 font-medium">Updated {formatDateTime(comic.lastUpdatedAt)}</div>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-5 space-y-4 shadow-sm self-start min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Selected Comic</div>
                <div className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">
                  {selectedComic?.title ?? "New comic draft"}
                </div>
              </div>
              <StatusBadge status={selectedComic?.status ?? "draft"} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Views</div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{selectedComic?.viewCount ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapters</div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{selectedComic?.chapters.length ?? 0}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => selectedComic && onOpenComic(selectedComic.id, "editor")}
                disabled={!selectedComic}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-cyan-500 py-3 text-sm font-bold text-white dark:text-slate-950 disabled:opacity-50 shadow-md"
              >
                <PencilLine size={16} /> Edit comic
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
