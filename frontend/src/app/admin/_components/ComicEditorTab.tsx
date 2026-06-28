"use client";

import React from "react";
import {
  AlertTriangle, BookOpen, CheckCircle2, PencilLine, Plus,
  ShieldAlert, Trash2, Upload, Wand2,
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
}) => {
  const selectedComicLabel = selectedComic
    ? selectedComic.title
    : "New comic draft";

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <BookOpen size={14} />
            Comic Editor
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a new comic or edit an existing record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNewDraft}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <Plus size={14} /> New draft
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={formBusy}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Save draft
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={formBusy || !canManageAll}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
          >
            <Wand2 size={14} /> Publish
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Title</div>
                <input
                  value={formValues.title}
                  onChange={(event) => onChangeForm({ ...formValues, title: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Comic title"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Author</div>
                <input
                  value={formValues.author}
                  onChange={(event) => onChangeForm({ ...formValues, author: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Author name"
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Description</div>
              <textarea
                value={formValues.description}
                onChange={(event) => onChangeForm({ ...formValues, description: event.target.value })}
                rows={6}
                className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                placeholder="Synopsis and editorial notes"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</div>
                <select
                  value={formValues.status}
                  onChange={(event) => onChangeForm({ ...formValues, status: event.target.value as ComicStatus })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            {formError ? (
              <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={formBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Save draft
              </button>
              <button
                type="button"
                onClick={onPrimarySubmit}
                disabled={formBusy || (!selectedComic && !canManageAll)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
              >
                {selectedComic ? <PencilLine size={14} /> : <Plus size={14} />}
                {selectedComic ? "Save changes" : "Create comic"}
              </button>
              <button
                type="button"
                onClick={onPublish}
                disabled={formBusy || !canManageAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200 disabled:opacity-50"
              >
                <Wand2 size={14} /> Publish now
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={formBusy || !selectedComic || !canManageAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Preview</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedComicLabel}</div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${statusToneFn(formValues.status)}`}
                >
                  {formValues.status}
                </span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                <img
                  src={coverPreview || "https://placehold.co/640x960/png?text=Comic+Cover"}
                  alt="Comic cover preview"
                  className="aspect-[2/3] w-full object-cover"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Slug</div>
                <div className="mt-1 break-all font-semibold text-slate-900 dark:text-white">{slugify(formValues.title)}</div>
              </div>
            </div>

            <label className="block rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-5 text-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onCoverFileChange(event.target.files?.[0] ?? null)}
              />
              <Upload size={18} className="mx-auto text-slate-500" />
              <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Upload cover image</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The file is sent through the Worker and proxied from R2.</p>
            </label>

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
