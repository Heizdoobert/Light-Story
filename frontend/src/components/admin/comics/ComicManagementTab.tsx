"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAutoSave } from "@/hooks/common/useAutoSave";
import {
  ComicChapterFormSchema,
  ComicCmsFormSchema,
  ComicModerationSchema,
  type ComicChapterFormValues,
  type ComicModerationState,
  type ComicCmsFormValues,
} from "@/lib/validation/comic-cms-schemas";
import {
  clearComicDraft,
  createComicChapterFromFiles,
  createComicFromMetadata,
  deleteComic,
  deleteComicChapter,
  fetchComicCatalog,
  listComicModerationState,
  loadComicCatalog,

  loadComicRecord,
  proxiedR2ImageUrl,
  recordComicAudit,
  saveComicDraft,
  saveComicModerationState,
  sortFilesByFilename,
  updateComicRecord,
  type ComicCatalogFilters,
  type ComicCmsRecord,
} from "@/services/comics/comicCms.service";
import { uploadComicCover } from "@/services/comics/comic.service";
import { isCbzFile, extractCbzFileToImages } from "@/lib/cbz/cbz-reader";
import {
  DEFAULT_FORM,
  DEFAULT_CHAPTER_FORM,
  MAX_PAGE_SIZE_BYTES,
  normalizePageOrder,
  toFormState,
  uniqueTokens,
  type PageDraft,
  type TabKey,
} from "@/lib/cms/comicCmsTypes";
import { ComicCatalogTab } from "./ComicCatalogTab";
import { ComicEditorTab } from "./ComicEditorTab";
import { ComicChaptersTab } from "./ComicChaptersTab";
import { ComicModerationTab } from "./ComicModerationTab";
import { ComicFeedbackTab } from "./ComicFeedbackTab";
import { ComicTrashTab } from "./ComicTrashTab";
import { TranslatorManagementTab } from "./TranslatorManagementTab";

const DEFAULT_MODERATION: ComicModerationState = {
  keywords: ["spoiler", "pirated", "leak"],
  reportedComments: [],
};

export const ComicManagementTab: React.FC = () => {
  const { role } = useAuth();
  const { t } = useLanguage();
  const canManageAll = role === "superadmin" || role === "admin";
  const canModerate = canManageAll || role === "employee";

  const [activeTab, setActiveTab] = useState<TabKey>("catalog");
  const [catalog, setCatalog] = useState<ComicCmsRecord[]>([]);
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ComicCatalogFilters>({
    search: "",
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
  const [, setCbzArchiveFile] = useState<File | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [moderation, setModeration] = useState<ComicModerationState>(() => {
    const saved = listComicModerationState();
    return saved.reportedComments.length > 0 ? saved : DEFAULT_MODERATION;
  });
  const [moderationBusy, setModerationBusy] = useState(false);

  const selectedComic = useMemo(
    () => (selectedComicId ? catalog.find((record) => record.id === selectedComicId) ?? null : null),
    [catalog, selectedComicId],
  );

  const draftKey = selectedComicId ?? "new";
  const autoSave = useAutoSave(`comic-cms:${draftKey}`, formValues, 1250);

  const selectedChapters = selectedComic?.chapters ?? [];

  useEffect(() => {
    const cached = loadComicCatalog();
    if (cached.length > 0) setCatalog(cached);
    fetchComicCatalog().then(setCatalog).catch(() => {
      if (cached.length === 0) toast.error(t("failed_load_comics"));
    });
  }, []);

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
      setCoverPreview(
        selectedComic
          ? proxiedR2ImageUrl(selectedComic.coverUrl)
          : formValues.coverUrl
            ? proxiedR2ImageUrl(formValues.coverUrl)
            : "",
      );
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
    fetchComicCatalog()
      .then((data) => {
        setCatalog(data);
        if (showToast) toast.success(t("catalog_refreshed"));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t("catalog_refreshed"));
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    refreshCatalog(false);
  }, [refreshCatalog]);

  const loadNewComicDraft = useCallback(() => {
    setSelectedComicId(null);
    setFormValues(DEFAULT_FORM);
    setCoverFile(null);
    setCoverPreview("");
    setFormError(null);
    setChapterValues(DEFAULT_CHAPTER_FORM);
    setChapterPages([]);
    setChapterError(null);
    try { localStorage.removeItem(`autosave_comic-cms:new`); } catch {}
    setActiveTab("editor");
    toast.info(t("editing_new_draft"));
  }, []);

  const openComic = useCallback((comicId: string, tab: TabKey = "editor") => {
    setSelectedComicId(comicId);
    setActiveTab(tab);
    setFormError(null);
    setChapterError(null);
    const stored = catalog.find((c) => c.id === comicId) || loadComicRecord(comicId);
    if (stored) {
      setFormValues(toFormState(stored));
      const nextChapterNum = (stored.chapters?.length || 0) + 1;
      setChapterValues({
        chapterNumber: nextChapterNum,
        title: `Chapter ${nextChapterNum}`,
      });
    }
  }, [catalog]);

  const applySavedRecord = useCallback((record: ComicCmsRecord) => {
    setCatalog((prev) => {
      const filtered = prev.filter((item) => item.id !== record.id);
      return [record, ...filtered].sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
    });
    setSelectedComicId(record.id);
    setFormValues(toFormState(record));
  }, []);

  const resetChapterPages = useCallback(() => {
    setCbzArchiveFile(null);
    setChapterPages((current) => {
      current.forEach((page) => URL.revokeObjectURL(page.previewUrl));
      return [];
    });
  }, []);

  const addChapterFiles = useCallback(async (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;
    const foundCbz = incomingFiles.find((f) => isCbzFile(f));
    if (foundCbz) {
      setCbzArchiveFile(foundCbz);
      try {
        toast.info(t("extracting_cbz"));
        const extracted = await extractCbzFileToImages(foundCbz);
        setChapterPages((current) => {
          const next = extracted.map((file, index) => ({
            id: crypto.randomUUID(),
            file,
            order: current.length + index + 1,
            previewUrl: URL.createObjectURL(file),
            sizeBytes: file.size,
            fileName: file.name,
          }));
          return [...current, ...next];
        });
      } catch (err) {
        toast.error(t("failed_unpack_cbz"));
      }
      setChapterError(null);
      return;
    }

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
      setFormError(parsed.error.issues[0]?.message ?? t("fix_metadata_before_save"));
      return;
    }
    setFormBusy(true);
    try {
      if (selectedComic) {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) nextCoverUrl = await uploadComicCover(coverFile);
        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
          lastUpdatedAt: new Date().toISOString(),
        };
        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.update", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.id,
        });
        applySavedRecord(saved);
        clearComicDraft(selectedComic.id);
        autoSave.clear();
        toast.success(t("comic_updated"));
      } else if (canManageAll) {
        const created = await createComicFromMetadata({ ...parsed.data, coverFile });
        await recordComicAudit("comic.create", {
          comicId: created.id,
          status: created.status,
          title: created.title,
          target_user_id: created.id,
        });
        applySavedRecord(created);
        clearComicDraft("new");
        autoSave.clear();
        toast.success(t("comic_created"));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("failed_save_comic");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormBusy(false);
    }
  }, [applySavedRecord, autoSave, canManageAll, coverFile, formValues, selectedComic]);

  const handleSaveDraft = useCallback(async () => {
    setFormError(null);
    const parsed = ComicCmsFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? t("fix_metadata_before_save");
      setFormError(msg);
      toast.error(msg);
      return;
    }
    saveComicDraft(draftKey, parsed.data);
    if (selectedComic) {
      try {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) nextCoverUrl = await uploadComicCover(coverFile);
        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
          lastUpdatedAt: new Date().toISOString(),
        };
        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.draft.save", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.id,
        });
        applySavedRecord(saved);
        autoSave.clear();
        toast.success(t("draft_saved_catalog"));
      } catch (error) {
        const msg = error instanceof Error ? error.message : t("failed_save_comic");
        setFormError(msg);
        toast.error(msg);
      }
      return;
    }
    await recordComicAudit("comic.draft.save", {
      comicId: draftKey,
      status: parsed.data.status,
      title: parsed.data.title,
      target_user_id: null,
    });
    toast.success(t("draft_saved_locally"));
  }, [applySavedRecord, autoSave, coverFile, draftKey, formValues, selectedComic]);

  const handlePublish = useCallback(async () => {
    if (!canManageAll) return;
    setFormError(null);
    const parsed = ComicCmsFormSchema.safeParse({ ...formValues, status: "published" });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? t("fix_metadata_before_publish");
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormBusy(true);
    try {
      const nextState = { ...parsed.data, status: "published" as const };
      if (selectedComic) {
        let nextCoverUrl = selectedComic.coverUrl;
        if (coverFile) nextCoverUrl = await uploadComicCover(coverFile);
        const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
          lastUpdatedAt: new Date().toISOString(),
        } as ComicCmsRecord;
        const saved = await updateComicRecord(updated);
        await recordComicAudit("comic.publish", {
          comicId: saved.id,
          status: saved.status,
          title: saved.title,
          target_user_id: selectedComic.id,
        });
        applySavedRecord(saved);
        clearComicDraft(selectedComic.id);
        autoSave.clear();
      } else {
        const created = await createComicFromMetadata({ ...nextState, coverFile });
        await recordComicAudit("comic.publish", {
          comicId: created.id,
          status: "published",
          title: created.title,
          target_user_id: created.id,
        });
        applySavedRecord(created);
        clearComicDraft("new");
        autoSave.clear();
      }
      toast.success(t("comic_published"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to publish comic.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormBusy(false);
    }
  }, [applySavedRecord, autoSave, canManageAll, coverFile, formValues, selectedComic]);

  const handleDelete = useCallback(async () => {
    if (!selectedComic || !canManageAll) return;
    setFormBusy(true);
    try {
      await deleteComic(selectedComic.id);
      await recordComicAudit("comic.delete", {
        comicId: selectedComic.id,
        status: selectedComic.status,
        title: selectedComic.title,
        target_user_id: selectedComic.id,
      });
      clearComicDraft(selectedComic.id);
      autoSave.clear();
      setSelectedComicId(null);
      setFormValues(DEFAULT_FORM);
      setCatalog((prev) => prev.filter((item) => item.id !== selectedComic.id));
      toast.success(t("comic_deleted"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete comic.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormBusy(false);
    }
  }, [autoSave, canManageAll, selectedComic]);

  const handleChapterFiles = useCallback(
    (incomingFiles: File[]) => {
      addChapterFiles(incomingFiles);
    },
    [addChapterFiles],
  );

  const handleChapterSave = useCallback(async () => {
    if (!selectedComic) {
      setChapterError(t("choose_comic_first"));
      return;
    }
    const parsed = ComicChapterFormSchema.safeParse(chapterValues);
    if (!parsed.success) {
      setChapterError(parsed.error.issues[0]?.message ?? t("fix_chapter_metadata"));
      return;
    }
    if (chapterPages.length === 0) {
      setChapterError(t("add_at_least_one_page"));
      return;
    }
    const oversize = chapterPages.find((page) => page.sizeBytes > MAX_PAGE_SIZE_BYTES);
    if (oversize) {
      setChapterError(t("page_exceeds_limit").replace("{name}", oversize.fileName));
      return;
    }
    setChapterBusy(true);
    try {
      const filesToUpload = [...chapterPages]
        .sort((left, right) => left.order - right.order)
        .map((page) => page.file);
      const chapter = await createComicChapterFromFiles(
        selectedComic,
        parsed.data,
        filesToUpload,
      );
      await recordComicAudit("comic.chapter.create", {
        comicId: selectedComic.id,
        chapterId: chapter.id,
        chapterNumber: parsed.data.chapterNumber,
        title: parsed.data.title,
        target_user_id: selectedComic.id,
      });
      clearComicDraft(selectedComic.id);
      autoSave.clear();
      setCatalog((prev) =>
        prev.map((item) => {
          if (item.id !== selectedComic.id) return item;
          const existingIdx = item.chapters.findIndex(
            (ch) => ch.id === chapter.id || ch.chapterNumber === chapter.chapterNumber,
          );
          let nextChapters = [...item.chapters];
          if (existingIdx !== -1) {
            nextChapters[existingIdx] = chapter;
          } else {
            nextChapters.push(chapter);
          }
          nextChapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
          return { ...item, chapters: nextChapters, lastUpdatedAt: new Date().toISOString() };
        }),
      );
      const nextNum = (selectedComic.chapters.length || 0) + 1;
      setChapterValues({
        chapterNumber: nextNum,
        title: `Chapter ${nextNum}`,
      });
      resetChapterPages();
      refreshCatalog(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("failed_save_chapter");
      setChapterError(msg);
      toast.error(msg);
    } finally {
      setChapterBusy(false);
    }
  }, [autoSave, chapterPages, chapterValues, refreshCatalog, resetChapterPages, selectedComic]);

  const handleDeleteChapter = useCallback(
    async (chapterId: string) => {
      if (!selectedComic) return;
      try {
        await deleteComicChapter(selectedComic.id, chapterId);
        await recordComicAudit("comic.chapter.delete", {
          comicId: selectedComic.id,
          chapterId,
          target_user_id: selectedComic.id,
        });
        setCatalog((prev) =>
          prev.map((item) =>
            item.id === selectedComic.id
              ? {
                  ...item,
                  chapters: item.chapters.filter((ch) => ch.id !== chapterId),
                  lastUpdatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        toast.success(t("chapter_deleted"));
        refreshCatalog(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("failed_delete_chapter"));
      }
    },
    [selectedComic],
  );

  const handleModerationAction = useCallback(
    async (commentId: string, nextStatus: ComicModerationState["reportedComments"][number]["status"]) => {
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
          target_user_id: selectedComic?.id ?? null,
        });
      } finally {
        setModerationBusy(false);
      }
    },
    [canModerate, moderation, selectedComic],
  );

  const handleAddKeyword = useCallback(
    async (keyword: string) => {
      if (!canModerate) return;
      setModerationBusy(true);
      try {
        const nextKeywords = uniqueTokens([...moderation.keywords, keyword.trim()]);
        const nextState = ComicModerationSchema.parse({
          keywords: nextKeywords,
          reportedComments: moderation.reportedComments,
        });
        setModeration(nextState);
        saveComicModerationState(nextState);
        await recordComicAudit("comic.moderation.keywords.update", {
          comicId: selectedComic?.id ?? "moderation-queue",
          keywords: nextState.keywords,
          target_user_id: selectedComic?.id ?? null,
        });
      } finally {
        setModerationBusy(false);
      }
    },
    [canModerate, moderation, selectedComic],
  );

  const handleClearKeyword = useCallback(
    async (keyword: string) => {
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
        target_user_id: selectedComic?.id ?? null,
      });
    },
    [canModerate, moderation, selectedComic],
  );

  const handleKeywordSave = useCallback(async () => {
    if (!canModerate) return;
    setModerationBusy(true);
    try {
      await recordComicAudit("comic.moderation.keywords.update", {
        comicId: selectedComic?.id ?? "moderation-queue",
        keywords: moderation.keywords,
        target_user_id: selectedComic?.id ?? null,
      });
      toast.success(t("profanity_filter_saved"));
    } finally {
      setModerationBusy(false);
    }
  }, [canModerate, moderation, selectedComic]);

  const totalPages = useMemo(
    () => selectedChapters.reduce((total, chapter) => total + chapter.pages.length, 0),
    [selectedChapters],
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-100">
              <Layers3 size={12} /> {t("cms_header_title")}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{t("cms_header_title")}</h1>
              <p className="mt-2 max-w-3xl text-sm md:text-base text-slate-300">
                {t("cms_header_desc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">{t("total_comics")}</div>
              <div className="mt-1 text-2xl font-black text-white">{catalog.length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">{t("drafts")}</div>
              <div className="mt-1 text-2xl font-black text-white">
                {catalog.filter((item) => item.status === "draft").length}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">{t("published")}</div>
              <div className="mt-1 text-2xl font-black text-white">
                {catalog.filter((item) => item.status === "published").length}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">{t("total_pages")}</div>
              <div className="mt-1 text-2xl font-black text-white">{totalPages}</div>
            </div>
          </div>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
        role="tablist"
        aria-label="Comic management sections"
      >
        {([
          ["catalog", t("tab_catalog")],
          ["editor", t("tab_editor")],
          ["chapters", t("tab_chapters")],
          ["translators", t("tab_translators")],
          ["feedback", t("tab_feedback")],
          ["trash", t("tab_trash")],
          ["moderation", t("tab_moderation")],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key as TabKey)}
            className={`rounded-full px-5 py-3 text-sm font-bold transition-all ${
              activeTab === key
                ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-md"
                : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => { loadNewComicDraft(); setActiveTab("editor"); }}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus size={16} /> {t("create_new_comic")}
          </button>
        </div>
      </div>

      {activeTab === "catalog" && (
        <ComicCatalogTab
          catalog={catalog}
          selectedComic={selectedComic}
          filters={filters}
          refreshing={refreshing}
          role={role}
          onFiltersChange={setFilters}
          onRefresh={refreshCatalog}
          onNewDraft={loadNewComicDraft}
          onOpenComic={openComic}
        />
      )}

      {activeTab === "editor" && (
        <ComicEditorTab
          selectedComic={selectedComic}
          canManageAll={canManageAll}
          formValues={formValues}
          formBusy={formBusy}
          formError={formError}
          coverPreview={coverPreview}
          catalog={catalog}
          onChangeForm={setFormValues}
          onCoverFileChange={setCoverFile}
          onSaveDraft={handleSaveDraft}
          onPrimarySubmit={handlePrimarySubmit}
          onPublish={handlePublish}
          onDelete={handleDelete}
          onNewDraft={loadNewComicDraft}
          onGoToChapters={() => setActiveTab("chapters")}
        />
      )}

      {activeTab === "chapters" && (
        <ComicChaptersTab
          catalog={catalog}
          selectedComic={selectedComic}
          selectedChapters={selectedChapters}
          chapterValues={chapterValues}
          chapterPages={chapterPages}
          chapterBusy={chapterBusy}
          chapterError={chapterError}
          onChapterValuesChange={setChapterValues}
          onAddFiles={handleChapterFiles}
          onRemovePage={removeChapterPage}
          onMovePage={moveChapterPage}
          onMovePageByDirection={moveChapterPageByDirection}
          onSave={handleChapterSave}
          onResetPages={resetChapterPages}
          onSelectComic={(comicId) => { setSelectedComicId(comicId); setChapterError(null); }}
          onDeleteChapter={handleDeleteChapter}
        />
      )}

      {activeTab === "translators" && (
        <TranslatorManagementTab catalog={catalog} />
      )}

      {activeTab === "feedback" && (
        <ComicFeedbackTab catalog={catalog} canManageAll={canManageAll} />
      )}

      {activeTab === "trash" && (
        <ComicTrashTab
          catalog={catalog}
          role={role}
          onRestoreComic={(id) => {
            toast.success(t("restore_success").replace("{id}", id));
            refreshCatalog(false);
          }}
          onHardDeleteComic={(id) => {
            handleDelete();
            toast.success(t("permanently_deleted").replace("{id}", id));
          }}
        />
      )}

      {activeTab === "moderation" && (
        <ComicModerationTab
          moderation={moderation}
          canModerate={canModerate}
          moderationBusy={moderationBusy}
          onReload={() => setModeration(listComicModerationState())}
          onSaveKeywords={handleKeywordSave}
          onAddKeyword={handleAddKeyword}
          onClearKeyword={handleClearKeyword}
          onModerationAction={handleModerationAction}
        />
      )}
    </div>
  );
};
