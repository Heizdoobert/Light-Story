"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/modules/auth/AuthContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  ComicChapterFormSchema,
  ComicCmsFormSchema,
  ComicModerationSchema,
  type ComicChapterFormValues,
  type ComicModerationState,
  type ComicCmsFormValues,
} from "@/lib/validation/comicCmsSchemas";
import {
  clearComicDraft,
  createComicChapterFromFiles,
  createComicFromMetadata,
  deleteComic,
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
} from "@/services/comicCms.service";
import { uploadComicCover } from "@/services/comic.service";
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

const DEFAULT_MODERATION: ComicModerationState = {
  keywords: ["spoiler", "pirated", "leak"],
  reportedComments: [],
};

export const ComicManagementTab: React.FC = () => {
  const { role } = useAuth();
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
      if (cached.length === 0) toast.error("Failed to load comics from server");
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
        if (showToast) toast.success("Catalog refreshed");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to refresh catalog");
      })
      .finally(() => setRefreshing(false));
  }, []);

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

  const applySavedRecord = useCallback((record: ComicCmsRecord) => {
    setCatalog((prev) => {
      const filtered = prev.filter((item) => item.id !== record.id);
      return [record, ...filtered].sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
    });
    setSelectedComicId(record.id);
    setFormValues(toFormState(record));
  }, []);

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
        toast.success("Comic updated");
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
        if (coverFile) nextCoverUrl = await uploadComicCover(coverFile);
      const updated: ComicCmsRecord = {
          ...selectedComic,
          ...parsed.data,
          coverUrl: nextCoverUrl,
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
      toast.success("Comic deleted");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete comic.");
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
      const chapter = await createComicChapterFromFiles(
        selectedComic,
        parsed.data,
        ordered.map((page) => page.file),
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
        prev.map((item) =>
          item.id === selectedComic.id
            ? { ...item, chapters: [...item.chapters, chapter], lastUpdatedAt: new Date().toISOString() }
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
      toast.success("Profanity filter saved");
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
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">Comics</div>
              <div className="mt-1 text-2xl font-black text-white">{catalog.length}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">Drafts</div>
              <div className="mt-1 text-2xl font-black text-white">
                {catalog.filter((item) => item.status === "draft").length}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">Published</div>
              <div className="mt-1 text-2xl font-black text-white">
                {catalog.filter((item) => item.status === "published").length}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">Pages</div>
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
          ["catalog", "Catalog"],
          ["editor", "Edit / Create"],
          ["chapters", "Chapters & Assets"],
          ["moderation", "Comments & Reports"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
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
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => { loadNewComicDraft(); setActiveTab("editor"); }}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus size={16} /> Create New Comic
          </button>
        </div>
      </div>

      {activeTab === "catalog" && (
        <ComicCatalogTab
          catalog={catalog}
          selectedComic={selectedComic}
          filters={filters}
          refreshing={refreshing}
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
          onChangeForm={setFormValues}
          onCoverFileChange={setCoverFile}
          onSaveDraft={handleSaveDraft}
          onPrimarySubmit={handlePrimarySubmit}
          onPublish={handlePublish}
          onDelete={handleDelete}
          onNewDraft={loadNewComicDraft}
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
