"use client";

import React from "react";
import { motion } from "motion/react";
import {
  AlertTriangle, BookOpen, CheckCircle2, Layers, PencilLine, Plus,
  ShieldAlert, Trash2, Upload, Wand2
} from "lucide-react";
import { type ComicCmsRecord } from "@/services/comicCms.service";
import type { ComicCmsFormValues, ComicStatus } from "@/lib/validation/comicCmsSchemas";
import { slugify, statusTone as statusToneFn } from "@/lib/cms/comicCmsTypes";

type ComicEditorTabProps = {
  selectedComic: ComicCmsRecord | null;
  canManageAll: boolean;
  formValues: ComicCmsFormValues;
  formBusy: boolean;
  formError: string | null;
  coverPreview: string;
  onChangeForm: (values: ComicCmsFormValues) => void;
  onCoverFileChange: (file: File | null) => void;
  onSaveDraft: () => void;
  onPrimarySubmit: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onNewDraft: () => void;
  onGoToChapters?: () => void;
};

export const ComicEditorTab: React.FC<ComicEditorTabProps> = ({
  selectedComic,
  canManageAll,
  formValues,
  formBusy,
  formError,
  coverPreview,
  onChangeForm,
  onCoverFileChange,
  onSaveDraft,
  onPrimarySubmit,
  onPublish,
  onDelete,
  onNewDraft,
  onGoToChapters,
}) => {
  const selectedComicLabel = selectedComic
    ? selectedComic.title
    : "New comic draft";

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    const isAutoSlug = !formValues.slug || formValues.slug === slugify(formValues.title);
    onChangeForm({
      ...formValues,
      title: newTitle,
      slug: isAutoSlug ? slugify(newTitle) : formValues.slug,
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeForm({
      ...formValues,
      slug: e.target.value,
    });
  };

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur transition-all">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <BookOpen size={14} className="text-cyan-500" />
            Comic Editor
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedComic ? `Editing: ${selectedComic.title}` : "Create a new comic draft with full slug and metadata control."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onNewDraft}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <Plus size={14} /> New draft
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onSaveDraft}
            disabled={formBusy}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 size={14} /> Save draft
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onPublish}
            disabled={formBusy || !canManageAll}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-cyan-500 dark:to-cyan-400 px-4 py-2 text-sm font-bold text-white dark:text-slate-950 disabled:opacity-50 shadow-md"
          >
            <Wand2 size={14} /> Publish
          </motion.button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT COLUMN: METADATA & FORM */}
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Title</div>
                <input
                  value={formValues.title}
                  onChange={handleTitleChange}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none transition"
                  placeholder="Comic title"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  Editable Slug
                </div>
                <input
                  value={formValues.slug || ""}
                  onChange={handleSlugChange}
                  className="w-full rounded-2xl border border-cyan-300/80 dark:border-cyan-800 bg-cyan-50/30 dark:bg-cyan-950/20 px-4 py-3 text-sm font-semibold text-cyan-950 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                  placeholder="custom-comic-slug"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Author</div>
                <input
                  value={formValues.author}
                  onChange={(event) => onChangeForm({ ...formValues, author: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                  placeholder="Author name"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</div>
                <select
                  value={formValues.status}
                  onChange={(event) => onChangeForm({ ...formValues, status: event.target.value as ComicStatus })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 block">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Description / Synopsis</div>
              <textarea
                value={formValues.description}
                onChange={(event) => onChangeForm({ ...formValues, description: event.target.value })}
                rows={5}
                className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none leading-relaxed"
                placeholder="Synopsis and editorial notes"
              />
            </label>

            {formError ? (
              <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {formError}
              </div>
            ) : null}

            {/* ACTION BUTTONS WITH MOTION EFFECTS */}
            <div className="flex flex-wrap gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onSaveDraft}
                disabled={formBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 shadow-sm"
              >
                <CheckCircle2 size={16} /> Save draft
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onPrimarySubmit}
                disabled={formBusy || (!selectedComic && !canManageAll)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-cyan-500 px-5 py-3 text-sm font-bold text-white dark:text-slate-950 disabled:opacity-50 shadow-md"
              >
                {selectedComic ? <PencilLine size={16} /> : <Plus size={16} />}
                {selectedComic ? "Save changes" : "Create comic"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onPublish}
                disabled={formBusy || !canManageAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-bold text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200 disabled:opacity-50 shadow-sm"
              >
                <Wand2 size={16} /> Publish now
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onDelete}
                disabled={formBusy || !selectedComic || !canManageAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-50 shadow-sm"
              >
                <Trash2 size={16} /> Delete
              </motion.button>
            </div>
          </div>

          {/* RIGHT COLUMN: COVER PREVIEW & INTEGRATED CHAPTERS WIDGET */}
          <div className="space-y-5">
            {/* COVER & QUICK INFO */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Comic Preview</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">{selectedComicLabel}</div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${statusToneFn(formValues.status)}`}
                >
                  {formValues.status}
                </span>
              </div>
              <div className="flex gap-4 items-start">
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 w-28 shrink-0">
                  <img
                    src={coverPreview || "https://placehold.co/640x960/png?text=Comic+Cover"}
                    alt="Comic cover preview"
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Active Slug</div>
                    <div className="mt-1 break-all font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      {formValues.slug || slugify(formValues.title)}
                    </div>
                  </div>
                  <label className="block rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center cursor-pointer hover:border-cyan-500 transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onCoverFileChange(event.target.files?.[0] ?? null)}
                    />
                    <Upload size={16} className="mx-auto text-slate-400" />
                    <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">Change Cover Image</div>
                  </label>
                </div>
              </div>
            </div>

            {/* INTEGRATED CHAPTERS SUMMARY WIDGET */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Chapters Overview ({selectedComic?.chapters.length ?? 0})
                  </h3>
                </div>
                {onGoToChapters && selectedComic && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onGoToChapters}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Manage Chapters &rarr;
                  </motion.button>
                )}
              </div>

              {!selectedComic ? (
                <div className="text-xs text-slate-400 text-center py-4">
                  Save comic metadata first to attach chapters.
                </div>
              ) : selectedComic.chapters.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">
                  No chapters created yet for this comic.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedComic.chapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Ch. {ch.chapterNumber} {ch.title ? `- ${ch.title}` : ""}
                      </div>
                      <div className="text-slate-400 font-medium text-[11px]">
                        {ch.pages.length} pages
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canManageAll ? null : (
              <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                Read-only mode. Your role can view comic metadata but cannot create or publish records.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

