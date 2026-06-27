"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileImage,
  Filter,
  GripVertical,
  Layers3,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/modules/auth/AuthContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  ComicChapterFormSchema,
  ComicCmsFormSchema,
  ComicModerationSchema,
  type ComicChapterFormValues,
  type ComicModerationState,
  type ComicReportedComment,
  type ComicStatus,
  type ComicCmsFormValues,
} from "@/lib/validation/comicCmsSchemas";
import {
  clearComicDraft,
  createComicChapterFromFiles,
  createComicFromMetadata,
  deleteComic,
  listComicModerationState,
  loadComicCatalog,
  loadComicCatalogFiltered,
  loadComicDraft,
  loadComicRecord,
  proxiedR2ImageUrl,
  recordComicAudit,

  saveComicDraft,
  saveComicModerationState,
  sortFilesByFilename,
  updateComicRecord,
  type ComicCatalogFilters,
  type ComicCmsRecord,
} from "@/services/comicCms.service";
import { uploadComicCover } from "@/services/comic.service";

type TabKey = "catalog" | "editor" | "chapters" | "moderation";

type PageDraft = {
  id: string;
  file: File;
  order: number;
  previewUrl: string;
  sizeBytes: number;
  fileName: string;
};

const DEFAULT_FORM: ComicCmsFormValues = {
  title: "",
  author: "",
  artist: "",
  translator: "",
  source: "",
  description: "",
  status: "draft",
  scheduledAt: null,
  genres: [],
  tags: [],
  rankScore: 0,
  coverUrl: "",
};

const DEFAULT_CHAPTER_FORM: ComicChapterFormValues = {
  chapterNumber: 1,
  title: "",
  status: "draft",
  scheduledAt: null,
};

const DEFAULT_MODERATION: ComicModerationState = ComicModerationSchema.parse({
  keywords: ["spoiler", "pirated", "leak"],
  reportedComments: [
    {
      id: "report-demo-1",
      comicId: "demo-comic",
      commentId: "comment-demo-1",
      reporter: "moderator.queue@lightstory.local",
      comment: "This chapter was mirrored from an unofficial source.",
      status: "open",
      createdAt: new Date().toISOString(),
    },
    {
      id: "report-demo-2",
      comicId: "demo-comic",
      commentId: "comment-demo-2",
      reporter: "community.bot@lightstory.local",
      comment: "Contains repeated spoiler paragraphs in the first frame.",
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ],
});

const MAX_PAGE_SIZE_BYTES = 2 * 1024 * 1024;

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "comic"
  );
}

function uniqueTokens(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizePageOrder(pages: PageDraft[]): PageDraft[] {
  return pages.map((page, index) => ({ ...page, order: index + 1 }));
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string | null | undefined): string {
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

function formatDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function toFormState(record: ComicCmsRecord): ComicCmsFormValues {
  return ComicCmsFormSchema.parse({
    title: record.title,
    author: record.author,
    artist: record.artist,
    translator: record.translator,
    source: record.source,
    description: record.description,
    status: record.status,
    scheduledAt: record.scheduledAt,
    genres: record.genres,
    tags: record.tags,
    rankScore: record.rankScore,
    coverUrl: record.coverUrl,
  });
}

function statusTone(status: ComicStatus): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20";
    case "archived":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20";
    default:
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20";
  }
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ComicStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${statusTone(status)}`}
    >
      {status}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {icon}
            {title}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ChipEditor({
  label,
  helper,
  values,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  helper: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(() => {
    const tokens = draft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (tokens.length === 0) return;
    onChange(uniqueTokens([...values, ...tokens]));
    setDraft("");
  }, [draft, onChange, values]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          {icon}
          {label}
        </label>
        <span className="text-[10px] font-semibold text-slate-400">{helper}</span>
      </div>
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {values.length === 0 ? (
            <span className="text-xs text-slate-400">No entries yet.</span>
          ) : (
            values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                {value}
                <Trash2 size={12} className="text-slate-400" />
              </button>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            type="button"
            onClick={commit}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export const ComicManagementTab: React.FC = () => {
  const { role } = useAuth();
  const canManageAll = role === "superadmin" || role === "admin";
  const canModerate = canManageAll || role === "employee";

  const [activeTab, setActiveTab] = useState<TabKey>("catalog");
  const [catalog, setCatalog] = useState<ComicCmsRecord[]>(() => loadComicCatalog());
  const [selectedComicId, setSelectedComicId] = useState<string | null>(catalog[0]?.id ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ComicCatalogFilters>({
    search: "",
    genre: "",
    status: "all",
    author: "",
  });

  const [formValues, setFormValues] = useState<ComicCmsFormValues>(DEFAULT_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [chapterValues, setChapterValues] = useState<ComicChapterFormValues>(DEFAULT_CHAPTER_FORM);
  const [chapterPages, setChapterPages] = useState<PageDraft[]>([]);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [pageDragId, setPageDragId] = useState<string | null>(null);
  const chapterInputRef = useRef<HTMLInputElement | null>(null);

  const [moderation, setModeration] = useState<ComicModerationState>(() => {
    const saved = listComicModerationState();
    return saved.reportedComments.length > 0 ? saved : DEFAULT_MODERATION;
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [moderationBusy, setModerationBusy] = useState(false);

  const selectedComic = useMemo(
    () => (selectedComicId ? catalog.find((record) => record.id === selectedComicId) ?? null : null),
    [catalog, selectedComicId],
  );

  const draftKey = selectedComicId ?? "new";
  const autoSave = useAutoSave(`comic-cms:${draftKey}`, formValues, 1250);

  const selectedComicLabel = selectedComic ? `${selectedComic.title} · ${selectedComic.slug}` : "New comic draft";

  const filteredCatalog = useMemo(() => loadComicCatalogFiltered(catalog, filters), [catalog, filters]);
  const sortedCatalog = useMemo(
    () => [...filteredCatalog].sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt)),
    [filteredCatalog],
  );
  const genreOptions = useMemo(
    () => uniqueTokens(catalog.flatMap((record) => record.genres)).sort((left, right) => left.localeCompare(right)),
    [catalog],
  );
  const authorOptions = useMemo(
    () => uniqueTokens(catalog.map((record) => record.author)).sort((left, right) => left.localeCompare(right)),
    [catalog],
  );
  const selectedChapters = selectedComic?.chapters ?? [];
  const totalPages = useMemo(
    () => selectedChapters.reduce((total, chapter) => total + chapter.pages.length, 0),
    [selectedChapters],
  );

  useEffect(() => {
    if (catalog.length > 0 && !selectedComicId) {
      setSelectedComicId(catalog[0].id);
    }
    if (catalog.length === 0 && selectedComicId) {
      setSelectedComicId(null);
    }
  }, [catalog, selectedComicId]);

  useEffect(() => {
    if (selectedComic) {
      const baseline = toFormState(selectedComic);
      const restored = autoSave.restore();
      if (restored) {
        const merged = ComicCmsFormSchema.safeParse({ ...baseline, ...restored });
        if (merged.success) setFormValues(merged.data);
      }
      return;
    }

    const restored = autoSave.restore();
    const nextDraftResult = ComicCmsFormSchema.safeParse({
      ...DEFAULT_FORM,
      ...(restored ?? {}),
    });
    setFormValues(nextDraftResult.success ? nextDraftResult.data : DEFAULT_FORM);
    setCoverFile(null);
  }, [draftKey, selectedComic]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(selectedComic ? proxiedR2ImageUrl(selectedComic.coverUrl) : formValues.coverUrl ? proxiedR2ImageUrl(formValues.coverUrl) : "");
      return;
    }

    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile, formValues.coverUrl, selectedComic]);

  useEffect(() => {
    if (!selectedComicId) return;
    const existing = selectedComic ?? loadComicRecord(selectedComicId);
    if (existing) {
      setChapterValues((current) => ({
        ...current,
        status: existing.status,
      }));
    }
  }, [selectedComic, selectedComicId]);

  useEffect(() => {
    saveComicModerationState(moderation);
  }, [moderation]);

  useEffect(() => {
    return () => {
      chapterPages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    };
  }, [chapterPages]);

  const refreshCatalog = useCallback((showToast = false) => {
    setRefreshing(true);
    try {
      const data = loadComicCatalog();
      setCatalog(data);
      if (showToast) toast.success("Catalog refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh catalog");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadNewComicDraft = useCallback(() => {
    setSelectedComicId(null);
    setFormValues(loadComicDraft("new") ?? DEFAULT_FORM);
    setCoverFile(null);
    setFormError(null);
    setChapterError(null);
    setActiveTab("editor");
    toast.info("Editing a new comic draft");
  }, []);

  const openComic = useCallback((comicId: string, tab: TabKey = "editor") => {
    setSelectedComicId(comicId);
    setActiveTab(tab);
    setFormError(null);
    setChapterError(null);
    const stored = loadComicRecord(comicId);
    if (stored) {
      setFormValues(toFormState(stored));
    }
  }, []);

  const applySavedRecord = useCallback(
    (record: ComicCmsRecord) => {
      setCatalog((prev) => {
        const filtered = prev.filter((item) => item.id !== record.id);
        return [record, ...filtered].sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
      });
      setSelectedComicId(record.id);
      setFormValues(toFormState(record));
    },
    [],
  );

  const resetChapterPages = useCallback(() => {
    setChapterPages((current) => {
      current.forEach((page) => URL.revokeObjectURL(page.previewUrl));
      return [];
    });
  }, []);

  const addChapterFiles = useCallback((incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    const sorted = sortFilesByFilename(incomingFiles);
    setChapterPages((current) => {
      const next = sorted.map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        order: current.length + index + 1,
        previewUrl: URL.createObjectURL(file),
        sizeBytes: file.size,
        fileName: file.name,
      }));
      return [...current, ...next];
    });
    setChapterError(null);
  }, []);

  const removeChapterPage = useCallback((pageId: string) => {
    setChapterPages((current) => {
      const next = current.filter((page) => page.id !== pageId);
      current.filter((page) => page.id === pageId).forEach((page) => URL.revokeObjectURL(page.previewUrl));
      return normalizePageOrder(next);
    });
  }, []);

  const moveChapterPage = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    setChapterPages((current) => {
      const fromIndex = current.findIndex((page) => page.id === fromId);
      const toIndex = current.findIndex((page) => page.id === toId);
      if (fromIndex === -1 || toIndex === -1) return current;

      const next = [...current];
      const [picked] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, picked);
      return normalizePageOrder(next);
    });
  }, []);

  const moveChapterPageByDirection = useCallback((pageId: string, direction: "up" | "down") => {
    setChapterPages((current) => {
      const index = current.findIndex((page) => page.id === pageId);
      if (index === -1) return current;

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return normalizePageOrder(next);
    });
  }, []);

  const handlePrimarySubmit = useCallback(async () => {
    setFormError(null);

    const parsed = ComicCmsFormSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Fix the comic metadata before saving.");
      return;
    }

    setFormBusy(true);
    try {
      if (selectedComic) {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) {
          nextCoverUrl = await uploadComicCover(coverFile);
        }

        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
          status: parsed.data.status,
          lastUpdatedAt: new Date().toISOString(),
        };

        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.update", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.storyId,
        });
        applySavedRecord(saved);
        clearComicDraft(selectedComic.id);
        autoSave.clear();
        toast.success("Comic updated");
      } else if (canManageAll) {
        const created = await createComicFromMetadata({
          ...parsed.data,
          coverFile,
        });
        await recordComicAudit("comic.create", {
          comicId: created.id,
          status: created.status,
          title: created.title,
          target_user_id: created.storyId,
        });
        applySavedRecord(created);
        clearComicDraft("new");
        autoSave.clear();
        toast.success("Comic created");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save comic.");
    } finally {
      setFormBusy(false);
    }
  }, [applySavedRecord, autoSave, canManageAll, coverFile, formValues, selectedComic]);

  const handleSaveDraft = useCallback(async () => {
    setFormError(null);

    const parsed = ComicCmsFormSchema.safeParse(formValues);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Fix the comic metadata before saving a draft.");
      return;
    }

    saveComicDraft(draftKey, parsed.data);

    if (selectedComic) {
      try {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) {
          nextCoverUrl = await uploadComicCover(coverFile);
        }

        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
          status: parsed.data.status,
          lastUpdatedAt: new Date().toISOString(),
        };

        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.draft.save", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.storyId,
        });
        applySavedRecord(saved);
        autoSave.clear();
        toast.success("Draft saved to catalog and local recovery storage");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Failed to save draft.");
      }
      return;
    }

    await recordComicAudit("comic.draft.save", {
      comicId: draftKey,
      status: parsed.data.status,
      title: parsed.data.title,
      target_user_id: null,
    });
    toast.success("Draft saved locally");
  }, [applySavedRecord, autoSave, coverFile, draftKey, formValues, selectedComic]);

  const handlePublish = useCallback(async () => {
    if (!canManageAll) return;
    setFormError(null);

    const parsed = ComicCmsFormSchema.safeParse({ ...formValues, status: "published" });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Fix the comic metadata before publishing.");
      return;
    }

    setFormBusy(true);
    try {
      const nextState = { ...parsed.data, status: "published" as const };
      if (selectedComic) {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) {
          nextCoverUrl = await uploadComicCover(coverFile);
        }

        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...nextState,
          coverUrl: nextCoverUrl,
          status: "published",
          lastUpdatedAt: new Date().toISOString(),
        };

        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.publish", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.storyId,
        });
        applySavedRecord(saved);
        clearComicDraft(selectedComic.id);
        autoSave.clear();
      } else {
        const created = await createComicFromMetadata({
          ...nextState,
          coverFile,
        });
        await recordComicAudit("comic.publish", {
          comicId: created.id,
          status: "published",
          title: created.title,
          target_user_id: created.storyId,
        });
        applySavedRecord(created);
        clearComicDraft("new");
        autoSave.clear();
      }

      toast.success("Comic published");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to publish comic.");
    } finally {
      setFormBusy(false);
    }
  }, [applySavedRecord, autoSave, canManageAll, coverFile, formValues, selectedComic]);

  const handleDelete = useCallback(async () => {
    if (!selectedComic || !canManageAll) return;
    setFormBusy(true);
    try {
      await deleteComic(selectedComic);
      await recordComicAudit("comic.delete", {
        comicId: selectedComic.id,
        status: selectedComic.status,
        title: selectedComic.title,
        target_user_id: selectedComic.storyId,
      });
      clearComicDraft(selectedComic.id);
      autoSave.clear();
      setSelectedComicId(null);
      setFormValues(DEFAULT_FORM);
      setCatalog((prev) => prev.filter((item) => item.id !== selectedComic.id));
      toast.success("Comic deleted");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete comic.");
    } finally {
      setFormBusy(false);
    }
  }, [autoSave, canManageAll, selectedComic]);

  const handleChapterFiles = useCallback((incomingFiles: File[]) => {
    addChapterFiles(incomingFiles);
  }, [addChapterFiles]);

  const handleChapterSave = useCallback(async () => {
    if (!selectedComic) {
      setChapterError("Choose a comic before uploading pages.");
      return;
    }

    const parsed = ComicChapterFormSchema.safeParse(chapterValues);
    if (!parsed.success) {
      setChapterError(parsed.error.issues[0]?.message ?? "Fix the chapter metadata before uploading.");
      return;
    }

    if (chapterPages.length === 0) {
      setChapterError("Add at least one page.");
      return;
    }

    const oversize = chapterPages.find((page) => page.sizeBytes > MAX_PAGE_SIZE_BYTES);
    if (oversize) {
      setChapterError(`Page ${oversize.fileName} exceeds the 2 MB limit.`);
      return;
    }

    setChapterBusy(true);
    try {
      const ordered = [...chapterPages].sort((left, right) => left.order - right.order);
      const chapter = await createComicChapterFromFiles(selectedComic, parsed.data, ordered.map((page) => page.file));
      await recordComicAudit("comic.chapter.create", {
        comicId: selectedComic.id,
        chapterId: chapter.id,
        chapterNumber: parsed.data.chapterNumber,
        title: parsed.data.title,
        target_user_id: selectedComic.storyId,
      });
      clearComicDraft(selectedComic.id);
      autoSave.clear();
      setCatalog((prev) =>
        prev.map((item) =>
          item.id === selectedComic.id
            ? {
                ...item,
                chapters: [...item.chapters, chapter],
                lastUpdatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setChapterValues(DEFAULT_CHAPTER_FORM);
      resetChapterPages();
      toast.success("Chapter uploaded and optimized");
    } catch (error) {
      setChapterError(error instanceof Error ? error.message : "Failed to save chapter.");
    } finally {
      setChapterBusy(false);
    }
  }, [autoSave, chapterPages, chapterValues, resetChapterPages, selectedComic]);

  const handleModerationAction = useCallback(async (commentId: string, nextStatus: ComicReportedComment["status"]) => {
    if (!canModerate) return;

    setModerationBusy(true);
    try {
      const nextState = ComicModerationSchema.parse({
        keywords: moderation.keywords,
        reportedComments: moderation.reportedComments.map((comment) =>
          comment.commentId === commentId ? { ...comment, status: nextStatus } : comment,
        ),
      });

      setModeration(nextState);
      saveComicModerationState(nextState);

      await recordComicAudit(`comic.comment.${nextStatus}`, {
        comicId: selectedComic?.id ?? "moderation-queue",
        commentId,
        status: nextStatus,
        target_user_id: selectedComic?.storyId ?? null,
      });
    } finally {
      setModerationBusy(false);
    }
  }, [canModerate, selectedComic]);

  const handleKeywordSave = useCallback(async () => {
    if (!canModerate) return;
    const nextKeywords = uniqueTokens([...moderation.keywords, ...keywordInput.split(",").map((item) => item.trim())]);
    const nextState = ComicModerationSchema.parse({
      keywords: nextKeywords,
      reportedComments: moderation.reportedComments,
    });
    setModeration(nextState);
    setKeywordInput("");
    saveComicModerationState(nextState);
    await recordComicAudit("comic.moderation.keywords.update", {
      comicId: selectedComic?.id ?? "moderation-queue",
      keywords: nextState.keywords,
      target_user_id: selectedComic?.storyId ?? null,
    });
    toast.success("Profanity filter saved");
  }, [canModerate, keywordInput, moderation, selectedComic]);

  const clearKeyword = useCallback(async (keyword: string) => {
    if (!canModerate) return;
    const nextState = ComicModerationSchema.parse({
      keywords: moderation.keywords.filter((item) => item !== keyword),
      reportedComments: moderation.reportedComments,
    });
    setModeration(nextState);
    saveComicModerationState(nextState);
    await recordComicAudit("comic.moderation.keywords.remove", {
      comicId: selectedComic?.id ?? "moderation-queue",
      keyword,
      target_user_id: selectedComic?.storyId ?? null,
    });
  }, [canModerate, moderation, selectedComic]);

  const selectedComicViews = selectedComic?.viewCount ?? 0;
  const chapterCount = selectedComic?.chapters.length ?? 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-100">
              <Layers3 size={12} /> Comic Management CMS
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Comic Management Tab</h1>
              <p className="mt-2 max-w-3xl text-sm md:text-base text-slate-300">
                Manage comic metadata, chapters, assets, moderation, and audit trails from one RBAC-aware control surface.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricPill label="Comics" value={catalog.length} />
            <MetricPill label="Drafts" value={catalog.filter((item) => item.status === "draft").length} />
            <MetricPill label="Published" value={catalog.filter((item) => item.status === "published").length} />
            <MetricPill label="Pages" value={totalPages} />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          ["catalog", "Catalog"],
          ["editor", "Edit / Create"],
          ["chapters", "Chapters & Assets"],
          ["moderation", "Comments & Reports"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as TabKey)}
            className={`rounded-full px-5 py-3 text-sm font-bold transition-all ${
              activeTab === key
                ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950"
                : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "catalog" && (
        <Panel
          title="Comic Catalog"
          subtitle="Search, filter, and open a comic for editing."
          icon={<Search size={14} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => refreshCatalog(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                type="button"
                onClick={loadNewComicDraft}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
              >
                <Plus size={14} /> New draft
              </button>
            </div>
          }
        >
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search comics"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ComicCatalogFilters["status"] }))}
                className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Genre</div>
              <select
                value={filters.genre}
                onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}
                className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">All genres</option>
                {genreOptions.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Author</div>
              <select
                value={filters.author}
                onChange={(event) => setFilters((current) => ({ ...current, author: event.target.value }))}
                className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
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

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-3">
              {sortedCatalog.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-10 text-center text-slate-500 dark:text-slate-400">
                  No comics match the current filters.
                </div>
              ) : (
                sortedCatalog.map((comic) => (
                  <button
                    key={comic.id}
                    onClick={() => openComic(comic.id, "editor")}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition-all ${
                      selectedComic?.id === comic.id
                        ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-500/10"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-cyan-300 dark:hover:border-cyan-700"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <img
                          src={proxiedR2ImageUrl(comic.coverUrl) || "https://placehold.co/96x128/png?text=Comic"}
                          alt={comic.title}
                          className="h-20 w-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">{comic.title}</h3>
                            <StatusBadge status={comic.status} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{comic.author} · {comic.slug}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{comic.description || "No description provided."}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 md:text-right">
                        <div>
                          <div className="font-black text-slate-700 dark:text-slate-200">{comic.chapters.length}</div>
                          chapters
                        </div>
                        <div>
                          <div className="font-black text-slate-700 dark:text-slate-200">{comic.viewCount}</div>
                          views
                        </div>
                        <div className="col-span-2">Updated {formatDateTime(comic.lastUpdatedAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Selected</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedComicLabel}</div>
                </div>
                <StatusBadge status={selectedComic?.status ?? "draft"} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Views</div>
                  <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selectedComicViews}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapters</div>
                  <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{chapterCount}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selectedComic && openComic(selectedComic.id, "editor")}
                  disabled={!selectedComic}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
                >
                  <PencilLine size={14} /> Edit comic
                </button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTab === "editor" && (
        <Panel
          title="Comic Editor"
          subtitle="Create a new comic or edit an existing record."
          icon={<BookOpen size={14} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadNewComicDraft}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                <Plus size={14} /> New draft
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={formBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Save draft
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={formBusy || !canManageAll}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
              >
                <Wand2 size={14} /> Publish
              </button>
            </div>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Title</div>
                  <input
                    value={formValues.title}
                    onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Comic title"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Slug</div>
                  <input
                    value={slugify(formValues.title)}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Author</div>
                  <input
                    value={formValues.author}
                    onChange={(event) => setFormValues((current) => ({ ...current, author: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Author name"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Artist</div>
                  <input
                    value={formValues.artist}
                    onChange={(event) => setFormValues((current) => ({ ...current, artist: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Artist name"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Translator</div>
                  <input
                    value={formValues.translator}
                    onChange={(event) => setFormValues((current) => ({ ...current, translator: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Translator"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Source</div>
                  <input
                    value={formValues.source}
                    onChange={(event) => setFormValues((current) => ({ ...current, source: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                    placeholder="Official source or reference"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Description</div>
                <textarea
                  value={formValues.description}
                  onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
                  rows={6}
                  className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Synopsis and editorial notes"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</div>
                  <select
                    value={formValues.status}
                    onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value as ComicStatus }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Scheduled at</div>
                  <input
                    value={formatDateTimeLocalInput(formValues.scheduledAt)}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, scheduledAt: parseDateTimeLocalInput(event.target.value) }))
                    }
                    type="datetime-local"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Rank score</div>
                  <input
                    value={formValues.rankScore}
                    onChange={(event) => setFormValues((current) => ({ ...current, rankScore: Number(event.target.value || 0) }))}
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ChipEditor
                  label="Genres"
                  helper="Comma separated"
                  values={formValues.genres}
                  onChange={(values) => setFormValues((current) => ({ ...current, genres: values }))}
                  placeholder="Action, fantasy, romance"
                  icon={<Tags size={12} />}
                />
                <ChipEditor
                  label="Tags"
                  helper="Comma separated"
                  values={formValues.tags}
                  onChange={(values) => setFormValues((current) => ({ ...current, tags: values }))}
                  placeholder="Official, trending, editorial"
                  icon={<Sparkles size={12} />}
                />
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
                  onClick={handleSaveDraft}
                  disabled={formBusy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Save draft
                </button>
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={formBusy || (!selectedComic && !canManageAll)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
                >
                  {selectedComic ? <PencilLine size={14} /> : <Plus size={14} />}
                  {selectedComic ? "Save changes" : "Create comic"}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={formBusy || !canManageAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200 disabled:opacity-50"
                >
                  <Wand2 size={14} /> Publish now
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
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
                  <StatusBadge status={formValues.status} />
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <img
                    src={coverPreview || "https://placehold.co/640x960/png?text=Comic+Cover"}
                    alt="Comic cover preview"
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Slug</div>
                    <div className="mt-1 break-all font-semibold text-slate-900 dark:text-white">{slugify(formValues.title)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Source</div>
                    <div className="mt-1 break-all font-semibold text-slate-900 dark:text-white">{formValues.source || "-"}</div>
                  </div>
                </div>
              </div>

              <label className="block rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-5 text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
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
        </Panel>
      )}

      {activeTab === "chapters" && (
        <Panel
          title="Chapters & Assets"
          subtitle="Upload pages, sort them, and push optimized assets through the Worker pipeline."
          icon={<FileImage size={14} />}
          actions={
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
                onClick={resetChapterPages}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                <Trash2 size={14} /> Clear queue
              </button>
            </div>
          }
        >
          <input
            ref={chapterInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleChapterFiles(Array.from(event.target.files ?? []))}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleChapterFiles(Array.from(event.dataTransfer.files ?? []));
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
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Selected comic: {selectedComicLabel}</div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapter number</div>
                <input
                  value={chapterValues.chapterNumber}
                  onChange={(event) => setChapterValues((current) => ({ ...current, chapterNumber: Number(event.target.value || 1) }))}
                  type="number"
                  min={1}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chapter title</div>
                <input
                  value={chapterValues.title}
                  onChange={(event) => setChapterValues((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Chapter title"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</div>
                <select
                  value={chapterValues.status}
                  onChange={(event) => setChapterValues((current) => ({ ...current, status: event.target.value as ComicStatus }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Scheduled at</div>
                <input
                  value={formatDateTimeLocalInput(chapterValues.scheduledAt)}
                  onChange={(event) =>
                    setChapterValues((current) => ({ ...current, scheduledAt: parseDateTimeLocalInput(event.target.value) }))
                  }
                  type="datetime-local"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"
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
                onClick={handleChapterSave}
                disabled={chapterBusy || !selectedComic}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
              >
                <Upload size={14} /> Upload chapter
              </button>
              <button
                type="button"
                onClick={() => handleChapterFiles([])}
                disabled={chapterBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                <RefreshCw size={14} /> Recalculate order
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
                        moveChapterPage(pageDragId, page.id);
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
                          onClick={() => moveChapterPageByDirection(page.id, "up")}
                          className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-300"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveChapterPageByDirection(page.id, "down")}
                          className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-300"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeChapterPage(page.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
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
        </Panel>
      )}

      {activeTab === "moderation" && (
        <Panel
          title="Comments & Reports"
          subtitle="Manage profanity filters, report queues, and moderation actions."
          icon={<ShieldAlert size={14} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModeration(listComicModerationState())}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200"
              >
                <RefreshCw size={14} /> Reload
              </button>
              <button
                type="button"
                onClick={handleKeywordSave}
                disabled={!canModerate}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950 disabled:opacity-50"
              >
                <Sparkles size={14} /> Save filter
              </button>
            </div>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                <Ban size={14} /> Profanity filter
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Keywords are stored locally for the demo admin workflow and audited whenever they change.
              </p>

              <div className="flex flex-wrap gap-2">
                {moderation.keywords.length === 0 ? (
                  <div className="text-sm text-slate-400">No keywords defined.</div>
                ) : (
                  moderation.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => clearKeyword(keyword)}
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
                  placeholder="Add keyword, comma separated"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleKeywordSave}
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
                          onClick={() => handleModerationAction(report.commentId, "dismissed")}
                          disabled={!canModerate || moderationBusy}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerationAction(report.commentId, "deleted")}
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
        </Panel>
      )}
    </div>
  );
};
