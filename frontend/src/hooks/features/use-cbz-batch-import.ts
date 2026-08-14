"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import {
  CBZ_LIMITS,
  CbzImportError,
  chapterTitleFromNumber,
  extractCbzImages,
  fetchExistingChapterNumbers,
  parseChapterNumberFromFilename,
  trackPageUpload,
  uploadChapterPage,
  upsertChapter,
} from "@/lib/r2/cbz-import";

export type BatchStatus =
  | "queued"
  | "extracting"
  | "uploading"
  | "upserting"
  | "done"
  | "replaced"
  | "failed"
  | "canceled"
  | "skipped";

export interface BatchRow {
  id: string;
  file: File;
  chapterNumber: number | null;
  title: string;
  status: BatchStatus;
  error?: string;
  replacesExisting: boolean;
  progressCurrent: number;
  progressTotal: number;
}

export interface BatchSummary {
  done: number;
  failed: number;
  replaced: number;
  skipped: number;
}

const errorMessage = (t: (k: string) => string, e: unknown): string => {
  if (e instanceof CbzImportError) {
    const key =
      e.code === "TOO_LARGE"
        ? "cbz_import_too_large"
        : e.code === "PAGE_TOO_LARGE"
          ? "cbz_import_page_too_large"
          : e.code === "TOO_MANY_PAGES"
            ? "cbz_import_too_many_pages"
            : e.code === "CORRUPT"
              ? "cbz_import_corrupt"
              : "cbz_import_empty_archive";
    return t(key)
      .replace("{n}", String(CBZ_LIMITS.maxPages))
      .replace("{mb}", String(CBZ_LIMITS.maxImageMB));
  }
  return t("cbz_import_corrupt");
};

let rowId = 0;

export function useCbzBatchImport(comicId: string | null) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [running, setRunning] = useState(false);
  const [existing, setExisting] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const rowsRef = useRef<BatchRow[]>([]);

  const patchRow = useCallback((id: string, patch: Partial<BatchRow>) => {
    rowsRef.current = rowsRef.current.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(rowsRef.current);
  }, []);

  const selectFiles = useCallback(
    async (files: File[]) => {
      if (running) return;
      const list = files.filter((f) => /\.(cbz|zip)$/i.test(f.name));
      if (list.length === 0) return;

      // dup check covers rows already in the queue (multi-pick fires separate change events)
      const usedNumbers = new Set<number>();
      for (const r of rowsRef.current) {
        if (r.chapterNumber !== null) usedNumbers.add(r.chapterNumber);
      }
      const newRows: BatchRow[] = [];
      for (const file of list) {
        const chapterNumber = parseChapterNumberFromFilename(file.name);
        const isDup = chapterNumber !== null && usedNumbers.has(chapterNumber);
        if (chapterNumber !== null) usedNumbers.add(chapterNumber);

        let status: BatchStatus = "queued";
        let error: string | undefined;
        if (chapterNumber === null) {
          status = "skipped";
          error = t("cbz_import_no_number");
        } else if (isDup) {
          status = "skipped";
          error = t("cbz_import_dup_number");
        } else if (file.size > CBZ_LIMITS.maxFileMB * 1024 * 1024) {
          status = "skipped";
          error = t("cbz_import_too_large").replace("{mb}", String(CBZ_LIMITS.maxFileMB));
        }

        newRows.push({
          id: `cbz-${rowId++}`,
          file,
          chapterNumber,
          title: chapterNumber !== null ? chapterTitleFromNumber(chapterNumber) : "",
          status,
          error,
          replacesExisting: chapterNumber !== null && existing.has(chapterNumber),
          progressCurrent: 0,
          progressTotal: 0,
        });
      }
      rowsRef.current = [...rowsRef.current, ...newRows];
      setRows(rowsRef.current);
    },
    [existing, running, t],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    rowsRef.current = rowsRef.current.map((r) =>
      ["queued", "extracting", "uploading"].includes(r.status)
        ? { ...r, status: "canceled" as BatchStatus }
        : r,
    );
    setRows(rowsRef.current);
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (!comicId || running) return;
    const queue = rowsRef.current.filter((r) => r.status === "queued");
    if (queue.length === 0) return;

    setRunning(true);
    abortRef.current = new AbortController();
    const abortSignal = abortRef.current.signal;

    // ponytail: pre-flight ⚠ is advisory; the worker upsert route is the real
    // duplicate gate (get-then-act race accepted — single admin session)
    let existingSet = existing;
    if (existingSet.size === 0) {
      try {
        const numbers = await fetchExistingChapterNumbers(comicId);
        existingSet = numbers;
        setExisting(numbers);
        rowsRef.current = rowsRef.current.map((r) =>
          r.chapterNumber !== null && numbers.has(r.chapterNumber)
            ? { ...r, replacesExisting: true }
            : r,
        );
        setRows(rowsRef.current);
      } catch {
        // advisory only — proceed
      }
    }

    let quotaDayWarned = false;
    let quotaMonthWarned = false;

    for (const row of queue) {
      if (abortSignal.aborted) break;
      const chapterNumber = row.chapterNumber;
      if (chapterNumber === null || row.status !== "queued") continue;

      // 1. extract
      patchRow(row.id, { status: "extracting", error: undefined });
      let images;
      try {
        images = await extractCbzImages(row.file);
      } catch (e) {
        patchRow(row.id, { status: "failed", error: errorMessage(t, e) });
        continue;
      }
      if (abortSignal.aborted) {
        patchRow(row.id, { status: "canceled" });
        break;
      }

      // 2. upload pages, pool of 6, 1 network retry inside uploadChapterPage
      patchRow(row.id, { status: "uploading", progressCurrent: 0, progressTotal: images.length });
      const urls: string[] = new Array(images.length);
      let failedPages = 0;
      let lastPageError = "";
      let next = 0;
      const workers = Array.from({ length: Math.min(CBZ_LIMITS.poolSize, images.length) }, async () => {
        while (!abortSignal.aborted) {
          const idx = next++;
          if (idx >= images.length) return;
          const page = images[idx];
          try {
            const mime = page.ext === "jpg" ? "image/jpeg" : `image/${page.ext}`;
            const file = new File([page.blob], `page_${String(idx + 1).padStart(3, "0")}.${page.ext}`, {
              type: mime,
            });
            const url = await uploadChapterPage(file, {
              comicId,
              chapterNumber,
              pageNumber: idx + 1,
            });
            urls[idx] = url;
            const usage = trackPageUpload();
            if (!quotaDayWarned && usage.dayCount >= CBZ_LIMITS.quotaDayWarn) {
              quotaDayWarned = true;
              toast.warning(t("cbz_import_quota_day"));
            }
            if (!quotaMonthWarned && usage.monthCount >= CBZ_LIMITS.quotaMonthWarn) {
              quotaMonthWarned = true;
              toast.warning(t("cbz_import_quota_month"));
            }
            const uploaded = urls.filter(Boolean).length;
            patchRow(row.id, { progressCurrent: uploaded });
          } catch (e) {
            failedPages += 1;
            lastPageError = e instanceof Error ? e.message : String(e);
          }
        }
      });
      await Promise.all(workers);

      if (abortSignal.aborted) {
        patchRow(row.id, { status: "canceled" });
        break;
      }
      if (failedPages > 0) {
        patchRow(row.id, {
          status: "failed",
          error: t("cbz_import_pages_failed").replace("{n}", String(failedPages)) + (lastPageError ? ` (${lastPageError})` : ""),
        });
        continue;
      }

      // 3. upsert chapter row
      patchRow(row.id, { status: "upserting" });
      try {
        await upsertChapter({
          comicId,
          chapterNumber,
          title: row.title,
          pageUrls: urls,
        });
        patchRow(row.id, { status: existingSet.has(chapterNumber) ? "replaced" : "done" });
      } catch (e) {
        patchRow(row.id, {
          status: "failed",
          error: t("cbz_import_upsert_error").replace("{error}", e instanceof Error ? e.message : String(e)),
        });
      }
    }

    setRunning(false);
  }, [comicId, running, existing, t, patchRow]);

  const summary: BatchSummary = rows.reduce(
    (acc, r) => {
      if (r.status === "done") acc.done += 1;
      else if (r.status === "replaced") acc.replaced += 1;
      else if (r.status === "failed") acc.failed += 1;
      else if (r.status === "skipped" || r.status === "canceled") acc.skipped += 1;
      return acc;
    },
    { done: 0, failed: 0, replaced: 0, skipped: 0 },
  );

  const canStart = !running && rows.some((r) => r.status === "queued") && !!comicId;

  return { rows, running, summary, canStart, selectFiles, run, cancel, existing };
}
