"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle, ChevronDown, ChevronRight, ChevronUp,
  GripVertical, Plus, Search, Trash2, Upload, X, Edit, Layers, FileImage
} from "lucide-react";
import { formatBytes, formatDateTime, type PageDraft } from "@/lib/cms/comicCmsTypes";
import type { ComicChapterFormValues } from "@/lib/validation/comicCmsSchemas";
import { proxiedR2ImageUrl, type ComicCmsRecord } from "@/services/comicCms.service";

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
  onDeleteChapter?: (chapterId: string) => void;
};

type ActiveModalMode = "none" | "choice" | "chapterList" | "builder";

export function ComicChaptersTab({
  catalog,
  selectedComic: _selectedComic,
  selectedChapters: _selectedChapters,
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
  onDeleteChapter,
}: ComicChaptersTabProps) {
  const chapterInputRef = useRef<HTMLInputElement>(null);
  const [pageDragId, setPageDragId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State Management
  const [modalMode, setModalMode] = useState<ActiveModalMode>("none");
  const [targetComicForModal, setTargetComicForModal] = useState<ComicCmsRecord | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; number: number; title: string } | null>(null);

  // Filtered comics list
  const filteredCatalog = catalog.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleComicClick = (comic: ComicCmsRecord) => {
    onSelectComic(comic.id);
    setTargetComicForModal(comic);
    setModalMode("choice");
  };

  const handleChooseEdit = () => {
    setModalMode("chapterList");
  };

  const handleChooseCreate = () => {
    setModalMode("builder");
  };

  const handleEditChapter = (chNum: number, title?: string) => {
    onChapterValuesChange({
      chapterNumber: chNum,
      title: title || "",
    });
    setModalMode("builder");
  };

  const handleDeleteClick = (chId: string, chNum: number, title?: string) => {
    setChapterToDelete({
      id: chId,
      number: chNum,
      title: title || `Chapter ${chNum}`,
    });
  };

  const confirmDeleteChapter = () => {
    if (chapterToDelete && onDeleteChapter) {
      onDeleteChapter(chapterToDelete.id);
    }
    setChapterToDelete(null);
  };

  return (
    <section className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-xl shadow-slate-950/5 backdrop-blur transition-all">
      {/* TAB HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            <Layers size={14} className="text-cyan-500" /> Chỉnh sửa chương (Edit Chapter)
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select a comic to edit existing chapters or upload a new chapter.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* COMIC SELECTION GRID */}
        {modalMode === "none" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search comic to edit chapters..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition shadow-sm"
                />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Found {filteredCatalog.length} comic(s)
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCatalog.map((comic) => (
                <motion.button
                  key={comic.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleComicClick(comic)}
                  className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-left shadow-sm hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-600 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={proxiedR2ImageUrl(comic.coverUrl) || "https://placehold.co/96x128/png?text=Comic"}
                      alt={comic.title}
                      className="h-20 w-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shrink-0 shadow"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                        {comic.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        Author: {comic.author}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        {comic.chapters.length} chapter(s)
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-cyan-500 transition">
                    <span>Manage chapters</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* MODAL 1: ACTION CHOICE MODAL (Edit or Create) */}
        <AnimatePresence>
          {modalMode === "choice" && targetComicForModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={proxiedR2ImageUrl(targetComicForModal.coverUrl) || "https://placehold.co/96x128/png?text=Comic"}
                      alt={targetComicForModal.title}
                      className="h-12 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                    />
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white line-clamp-1">
                        {targetComicForModal.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {targetComicForModal.chapters.length} existing chapters
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalMode("none")}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select an action:
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleChooseEdit}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/50 dark:bg-cyan-950/30 hover:bg-cyan-100/50 dark:hover:bg-cyan-900/40 transition text-left"
                  >
                    <div>
                      <div className="font-black text-sm text-cyan-950 dark:text-cyan-200 flex items-center gap-2">
                        <Edit size={16} /> Chỉnh sửa chương (Edit Chapters)
                      </div>
                      <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-1">
                        View, reorder, edit or delete existing chapters.
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-cyan-500" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleChooseCreate}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Plus size={16} className="text-cyan-500" /> Thêm chương mới (Create Chapter)
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Upload new page images or .cbz archive for a new chapter.
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: CHAPTER LIST MODAL (Scrollable list with Edit & Delete warning) */}
        <AnimatePresence>
          {modalMode === "chapterList" && targetComicForModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      Danh sách chương - {targetComicForModal.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total: {targetComicForModal.chapters.length} chapters
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalMode("builder")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-sm hover:bg-cyan-400 transition"
                    >
                      <Plus size={14} /> Add new
                    </button>
                    <button
                      onClick={() => setModalMode("none")}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {targetComicForModal.chapters.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                      Chưa có chương nào cho truyện này.
                    </div>
                  ) : (
                    targetComicForModal.chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition"
                      >
                        <div>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            Chương {ch.chapterNumber} {ch.title ? `- ${ch.title}` : ""}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {ch.pages.length} pages &bull; Updated {formatDateTime(ch.updatedAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditChapter(ch.chapterNumber, ch.title)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 text-xs font-bold shadow-sm"
                          >
                            <Edit size={14} /> Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteClick(ch.id, ch.chapterNumber, ch.title)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-sm"
                          >
                            <Trash2 size={14} /> Delete
                          </motion.button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* WARNING CONFIRMATION MODAL FOR DELETING A CHAPTER */}
        <AnimatePresence>
          {chapterToDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white">Cảnh báo xóa chương</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    Bạn có chắc chắn muốn xóa <span className="font-bold text-rose-600">{chapterToDelete.title}</span> không? Hành động này không thể hoàn tác.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setChapterToDelete(null)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={confirmDeleteChapter}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white shadow-md transition"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* BUILDER VIEW: CREATE / EDIT CHAPTER FORM */}
        {modalMode === "builder" && targetComicForModal && (
          <div className="space-y-5">
            {/* PINNED TARGET BANNER AT TOP */}
            <div className="flex items-center justify-between rounded-2xl border border-cyan-300/80 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/30 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={proxiedR2ImageUrl(targetComicForModal.coverUrl) || "https://placehold.co/96x128/png?text=Comic"}
                  alt={targetComicForModal.title}
                  className="h-10 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Target Comic</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{targetComicForModal.title}</div>
                </div>
              </div>
              <button
                onClick={() => setModalMode("none")}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back to Comic Grid
              </button>
            </div>

            <input
              ref={chapterInputRef}
              type="file"
              accept="image/*,.cbz,.zip,.cbr"
              multiple
              className="hidden"
              onChange={(event) => onAddFiles(Array.from(event.target.files ?? []))}
            />

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onAddFiles(Array.from(event.dataTransfer.files ?? []));
              }}
              className="rounded-[2rem] border-2 border-dashed border-cyan-300 bg-cyan-50/30 dark:bg-cyan-950/20 p-5 space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {chapterError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => chapterInputRef.current?.click()}
                  disabled={chapterBusy}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-cyan-500 px-4 py-3 text-sm font-bold text-white dark:text-slate-950 disabled:opacity-50 shadow-md"
                >
                  <Upload size={16} /> Choose pages or .cbz file
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onSave}
                  disabled={chapterBusy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/50 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-300 disabled:opacity-50 shadow-sm"
                >
                  <FileImage size={16} /> Save / Upload Chapter
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onResetPages}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm"
                >
                  <Trash2 size={16} /> Clear queue
                </motion.button>
              </div>

              {/* PAGE QUEUE PREVIEW GRID */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pt-2">
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
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMovePageByDirection(page.id, "down")}
                            className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-300"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemovePage(page.id)}
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
          </div>
        )}
      </div>
    </section>
  );
}
