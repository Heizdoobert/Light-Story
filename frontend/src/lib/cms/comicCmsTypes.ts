import type { ComicCmsFormValues, ComicChapterFormValues, ComicStatus } from "@/lib/validation/comicCmsSchemas";

export type TabKey = "catalog" | "editor" | "chapters" | "moderation";

export type PageDraft = {
  id: string;
  file: File;
  order: number;
  previewUrl: string;
  sizeBytes: number;
  fileName: string;
};

export const MAX_PAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const DEFAULT_FORM: ComicCmsFormValues = {
  title: "",
  author: "",
  description: "",
  status: "draft",
  coverUrl: "",
};

export const DEFAULT_CHAPTER_FORM: ComicChapterFormValues = {
  chapterNumber: 1,
  title: "",
};

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "comic"
  );
}

export function uniqueTokens(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizePageOrder(pages: PageDraft[]): PageDraft[] {
  return pages.map((page, index) => ({ ...page, order: index + 1 }));
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function toFormState(record: {
  status: ComicStatus;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
}): ComicCmsFormValues {
  return {
    title: record.title,
    author: record.author,
    description: record.description ?? "",
    status: record.status,
    coverUrl: record.coverUrl ?? "",
  };
}

export function statusTone(status: ComicStatus): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "ongoing":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20";
    case "completed":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20";
    case "archived":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20";
    default:
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20";
  }
}
