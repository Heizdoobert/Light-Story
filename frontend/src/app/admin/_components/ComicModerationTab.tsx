"use client";

import { useState } from "react";
import { Ban, CheckCircle2, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/cms/comicCmsTypes";
import type { ComicModerationState, ComicReportedComment } from "@/lib/validation/comicCmsSchemas";

type ComicModerationTabProps = {
  moderation: ComicModerationState;
  canModerate: boolean;
  moderationBusy: boolean;
  onReload: () => void;
  onSaveKeywords: () => void;
  onAddKeyword: (keyword: string) => void;
  onClearKeyword: (keyword: string) => void;
  onModerationAction: (commentId: string, status: ComicReportedComment["status"]) => void;
};

export function ComicModerationTab({
  moderation,
  canModerate,
  moderationBusy,
  onReload,
  onSaveKeywords,
  onAddKeyword,
  onClearKeyword,
  onModerationAction,
}: ComicModerationTabProps) {
  const [keywordInput, setKeywordInput] = useState("");

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    onAddKeyword(trimmed);
    setKeywordInput("");
  };

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <ShieldAlert size={14} />
            Comments & Reports
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage profanity filters, report queues, and moderation actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <RefreshCw size={14} /> Reload
          </button>
          <button
            type="button"
            onClick={onSaveKeywords}
            disabled={!canModerate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
          >
            <Sparkles size={14} /> Save filter
          </button>
        </div>
      </div>
      <div className="p-5">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
              <Ban size={14} /> Profanity filter
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Keywords are persisted to storage and audited on change.
            </p>
            <div className="flex flex-wrap gap-2">
              {moderation.keywords.length === 0 ? (
                <div className="text-sm text-slate-400">No keywords defined.</div>
              ) : (
                moderation.keywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => onClearKeyword(keyword)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    {keyword}
                    <Trash2 size={12} className="text-slate-400" />
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddKeyword();
                }}
                placeholder="Add keyword, comma separated"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={!canModerate}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {canModerate ? null : (
              <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                Your role can view moderation data but cannot modify it.
              </div>
            )}
          </div>
          <div className="space-y-3">
            {moderation.reportedComments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 p-8 text-sm text-slate-500 dark:text-slate-400">
                No reported comments in the queue.
              </div>
            ) : (
              moderation.reportedComments.map((report) => (
                <article key={report.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          {report.status}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{report.reporter}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{report.comment}</p>
                      <div className="text-xs text-slate-400">Reported {formatDateTime(report.createdAt)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onModerationAction(report.commentId, "dismissed")}
                        disabled={!canModerate || moderationBusy}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => onModerationAction(report.commentId, "deleted")}
                        disabled={!canModerate || moderationBusy}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
