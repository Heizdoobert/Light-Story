"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle, BookOpen, ChevronDown, ChevronUp,
  FileImage, GripVertical, Trash2, Upload,
} from "lucide-react";
import { formatBytes, formatDateTime, type PageDraft } from "@/lib/cms/comicCmsTypes";
import type { ComicChapterFormValues } from "@/lib/validation/comicCmsSchemas";
import type { ComicCmsRecord } from "@/services/comicCms.service";

type ComicChaptersTabProps = {
  catalog: ComicCmsRecord[];
  selectedComic: ComicCmsRecord | null;
  selectedChapters: ComicCmsRecord["chapters"];
  chapterValues: ComicChapterFormValues;
  chapterPages: PageDraft[];
  chapterBusy: boolean;
  chapterError: string | null;
  onChapterValuesChange: (values: ComicChapterFormValues) => void;
  onAddFiles: (files: File[]) => void;
  onRemovePage: (pageId: string) => void;
  onMovePage: (fromId: string, toId: string) => void;
  onMovePageByDirection: (pageId: string, direction: "up" | "down") => void;
  onSave: () => void;
  onResetPages: () => void;
  onSelectComic: (comicId: string) => void;
};

export function ComicChaptersTab({
  catalog,
  selectedComic,
  selectedChapters,
  chapterValues,
  chapterPages,
  chapterBusy,
  chapterError,
  onChapterValuesChange,
  onAddFiles,
  onRemovePage,
  onMovePage,
  onMovePageByDirection,
  onSave,
  onResetPages,
  onSelectComic,
}: ComicChaptersTabProps) {
  const chapterInputRef = useRef<HTMLInputElement>(null);
  const [pageDragId, setPageDragId] = useState<string | null>(null);

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <FileImage size={14} /> Chapters & Assets
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload pages, sort them, and push optimized assets through the Worker pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => chapterInputRef.current?.click()}
            disabled={!selectedComic || chapterBusy}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
          >
            <Upload size={14} /> Add pages
          </button>
          <button
            type="button"
            onClick={onResetPages}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <Trash2 size={14} /> Clear queue
          </button>
        </div>
      </div>
      <div className="p-5 space-y-5">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 px-4 py-3">
          <BookOpen size={16} className="shrink-0 text-slate-400" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Target comic</div>
            <select
              value={selectedComic?.id ?? ""}
              onChange={(e) => { const v = e.target.value; if (v) onSelectComic(v); }}
              className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">Select a comic...</option>
              {catalog.map((comic) => (
                <option key={comic.id} value={comic.id}>
                  {comic.title} ({comic.status})
                </option>
              ))}
            </select>
          </div>
        </label>

        <input
          ref={chapterInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => onAddFiles(Array.from(event.target.files ?? []))}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            onAddFiles(Array.from(event.dataTransfer.files ?? []));
          }}
          className={`rounded-[2rem] border-2 border-dashed p-5 ${
            selectedComic ? "border-cyan-300 bg-cyan-50/40 dark:bg-cyan-950/20" : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                <BookOpen size={14} /> Chapter builder
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Add a chapter title, pick page images, then reorder them before upload. Files over 2 MB are blocked.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapter number</div>
              <input
                value={chapterValues.chapterNumber}
                onChange={(event) => onChapterValuesChange({ ...chapterValues, chapterNumber: Number(event.target.value || 1) })}
                type="number"
                min={1}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </label>
            <label className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapter title</div>
              <input
                value={chapterValues.title}
                onChange={(event) => onChapterValuesChange({ ...chapterValues, title: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                placeholder="Chapter title"
              />
            </label>
          </div>

          {chapterError ? (
            <div className="mt-4 flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {chapterError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={chapterBusy || !selectedComic}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
            >
              <Upload size={14} /> Upload chapter
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {chapterPages.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-10 text-center text-slate-500 dark:text-slate-400">
                Drop page images here or use the upload button above.
              </div>
            ) : (
              chapterPages.map((page) => (
                <article
                  key={page.id}
                  draggable
                  onDragStart={() => setPageDragId(page.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (pageDragId) {
                      onMovePage(pageDragId, page.id);
                      setPageDragId(null);
                    }
                  }}
                  className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-sm"
                >
                  <img
                    src={page.previewUrl}
                    alt={page.fileName}
                    className="aspect-[2/3] w-full rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                        <GripVertical size={12} /> Page {page.order}
                      </div>
                      <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{page.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatBytes(page.sizeBytes)}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onMovePageByDirection(page.id, "up")}
                        className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-300"
                        aria-label="Move page up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMovePageByDirection(page.id, "down")}
                        className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-300"
                        aria-label="Move page down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePage(page.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                        aria-label="Remove page"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Existing chapters</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{selectedChapters.length} chapter(s)</div>
          </div>
          {selectedChapters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 p-8 text-sm text-slate-500 dark:text-slate-400">
              No uploaded chapters yet.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {selectedChapters.map((chapter) => (
                <div key={chapter.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapter {chapter.chapterNumber}</div>
                      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{chapter.title}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updated {formatDateTime(chapter.updatedAt)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        {chapter.pages.length} pages
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {chapter.pages.slice(0, 3).map((page) => (
                      <img
                        key={page.id}
                        src={page.previewUrl}
                        alt={page.fileName}
                        className="h-24 w-full rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
