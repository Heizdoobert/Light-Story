"use client";

import { useRef, useState } from "react";
import { FileArchive, Upload, Play, Ban, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useCbzBatchImport, type BatchStatus } from "@/hooks/features/use-cbz-batch-import";

interface CbzBatchImportModalProps {
  open: boolean;
  onClose: () => void;
  comicId: string | null;
  onComplete: () => void;
}

const STATUS_STYLES: Record<BatchStatus, { label: string; className: string }> = {
  queued: { label: "cbz_import_status_queued", className: "bg-slate-700 text-slate-200" },
  extracting: { label: "cbz_import_status_extracting", className: "bg-blue-500/20 text-blue-300" },
  uploading: { label: "cbz_import_status_uploading", className: "bg-amber-500/20 text-amber-300" },
  upserting: { label: "cbz_import_status_upserting", className: "bg-blue-500/20 text-blue-300" },
  done: { label: "cbz_import_status_done", className: "bg-emerald-500/20 text-emerald-300" },
  replaced: { label: "cbz_import_status_replaced", className: "bg-orange-500/20 text-orange-300" },
  failed: { label: "cbz_import_status_failed", className: "bg-rose-500/20 text-rose-300" },
  canceled: { label: "cbz_import_status_canceled", className: "bg-slate-700 text-slate-400" },
  skipped: { label: "cbz_import_status_skipped", className: "bg-slate-700 text-slate-400" },
};

export function CbzBatchImportModal({ open, onClose, comicId, onComplete }: CbzBatchImportModalProps) {
  const { t } = useLanguage();
  const { rows, running, summary, canStart, selectFiles, run, cancel } = useCbzBatchImport(comicId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const completedRef = useRef(false);

  const handleFiles = async (files: FileList | File[]) => {
    completedRef.current = false;
    await selectFiles(Array.from(files));
  };

  const handleStart = () => {
    completedRef.current = false;
    void run().then(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    });
  };

  const handleClose = () => {
    if (running) cancel();
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} variant="dark" className="max-w-2xl" title={t("cbz_import_title")}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">{t("cbz_import_subtitle")}</p>

        {/* Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer ${
            isDragging
              ? "border-orange-500 bg-orange-500/10"
              : "border-slate-700 hover:border-orange-500 hover:bg-slate-800/50"
          }`}
        >
          <Upload size={26} className="text-slate-500 mb-2" />
          <span className="text-sm font-bold text-slate-200">{t("cbz_import_pick")}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".cbz,.zip,application/x-cbz,application/zip"
            onChange={(e) => {
              void handleFiles(e.target.files ?? []);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="hidden"
          />
        </label>

        {/* Rows */}
        {rows.length > 0 && (
          <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            {rows.map((row) => {
              const style = STATUS_STYLES[row.status];
              const pct = row.progressTotal > 0 ? Math.round((row.progressCurrent / row.progressTotal) * 100) : 0;
              return (
                <div key={row.id} className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-400 truncate">{row.file.name}</div>
                      <div className="text-sm font-bold text-white">{row.title}</div>
                      {row.replacesExisting && row.chapterNumber !== null && (
                        <div className="text-[11px] text-orange-400 flex items-center gap-1">
                          <AlertTriangle size={11} />
                          {t("cbz_import_replacing").replace("{n}", String(row.chapterNumber))}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-bold ${style.className}`}>
                      {row.status === "uploading"
                        ? t(style.label).replace("{current}", String(row.progressCurrent)).replace("{total}", String(row.progressTotal))
                        : t(style.label)}
                    </span>
                  </div>
                  {row.status === "uploading" && (
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {row.error && <div className="text-[11px] text-rose-400 break-words">{row.error}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {rows.length > 0 && !running && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {t("cbz_import_summary")
              .replace("{done}", String(summary.done + summary.replaced))
              .replace("{failed}", String(summary.failed))
              .replace("{replaced}", String(summary.replaced))
              .replace("{skipped}", String(summary.skipped))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          {running ? (
            <Button variant="danger" onClick={cancel} className="gap-2">
              <Ban size={16} /> {t("cbz_import_cancel")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("cbz_import_close")}
              </Button>
              <Button disabled={!canStart} onClick={handleStart} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold">
                <Play size={16} /> {t("cbz_import_start")}
              </Button>
            </>
          )}
        </div>

        {running && (
          <div className="flex items-center gap-2 text-xs text-orange-400 font-semibold">
            <Loader2 size={14} className="animate-spin" />
            <FileArchive size={14} />
            <span className="text-slate-300">{t("cbz_import_status_uploading").replace("{current}", String(summary.done + summary.replaced + summary.failed + summary.skipped)).replace("{total}", String(rows.length))}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CbzBatchImportModal;
