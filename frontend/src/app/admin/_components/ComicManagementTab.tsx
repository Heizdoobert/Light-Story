"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, Search, Upload } from "lucide-react";
import {
  createComic,
  createComicChapter,
  listComicContexts,
  saveComicContext,
  type ComicContext,
  uploadChapterImages,
  uploadComicCover,
} from "@/services/comic.service";

type SubTab = "create_comic" | "add_chapter";

type ImageEntry = {
  id: string;
  file: File;
  order: number;
  preview: string;
};

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

function normalizeOrder(images: ImageEntry[]): ImageEntry[] {
  return images.map((entry, index) => ({ ...entry, order: index + 1 }));
}

function parseCategoryInput(input: string): string[] {
  const chunks = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return Array.from(new Set(chunks));
}

export const ComicManagementTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("create_comic");

  const [comicLibrary, setComicLibrary] = useState<ComicContext[]>([]);
  const [selectedComicId, setSelectedComicId] = useState("");
  const [comicSearch, setComicSearch] = useState("");
  const [comicCategoryFilter, setComicCategoryFilter] = useState("all");

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createAuthor, setCreateAuthor] = useState("");
  const [createStatus, setCreateStatus] = useState<"ongoing" | "completed">("ongoing");
  const [createCategoryInput, setCreateCategoryInput] = useState("");
  const [createCover, setCreateCover] = useState<File | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterImages, setChapterImages] = useState<ImageEntry[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [dragImageId, setDragImageId] = useState<string | null>(null);

  const chapterImagesRef = useRef<ImageEntry[]>([]);

  const generatedSlug = useMemo(() => slugify(createTitle), [createTitle]);

  const selectedComic = useMemo(
    () => comicLibrary.find((comic) => comic.id === selectedComicId) ?? null,
    [comicLibrary, selectedComicId],
  );

  const availableCategoryFilters = useMemo(() => {
    const values = new Set<string>();
    comicLibrary.forEach((comic) => comic.category.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [comicLibrary]);

  const filteredComics = useMemo(() => {
    const needle = comicSearch.trim().toLowerCase();

    return comicLibrary.filter((comic) => {
      const categoryMatch =
        comicCategoryFilter === "all" || comic.category.some((item) => item.toLowerCase() === comicCategoryFilter.toLowerCase());

      if (!categoryMatch) return false;
      if (!needle) return true;

      return (
        comic.title.toLowerCase().includes(needle) ||
        comic.slug.toLowerCase().includes(needle) ||
        comic.author.toLowerCase().includes(needle)
      );
    });
  }, [comicLibrary, comicSearch, comicCategoryFilter]);

  useEffect(() => {
    const existing = listComicContexts();
    setComicLibrary(existing);
    if (existing.length > 0) {
      setSelectedComicId(existing[0].id);
    }
  }, []);

  useEffect(() => {
    chapterImagesRef.current = chapterImages;
  }, [chapterImages]);

  useEffect(() => {
    return () => {
      chapterImagesRef.current.forEach((entry) => URL.revokeObjectURL(entry.preview));
    };
  }, []);

  const appendChapterImages = (files: File[]) => {
    if (files.length === 0) return;

    setChapterImages((prev) => {
      const next = files.map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        order: prev.length + index + 1,
        preview: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
    setOrderConfirmed(false);
  };

  const removeChapterImage = (id: string) => {
    setChapterImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return normalizeOrder(prev.filter((item) => item.id !== id));
    });
    setOrderConfirmed(false);
  };

  const clearChapterImages = () => {
    setChapterImages((prev) => {
      prev.forEach((entry) => URL.revokeObjectURL(entry.preview));
      return [];
    });
    setOrderConfirmed(false);
  };

  const moveByDrag = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    setChapterImages((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragged);
      return normalizeOrder(next);
    });

    setOrderConfirmed(false);
  };

  const moveImageByDirection = (id: string, direction: "up" | "down") => {
    setChapterImages((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return normalizeOrder(next);
    });

    setOrderConfirmed(false);
  };

  const handleCreateComic = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreateWarning(null);

    if (!createCover) {
      setCreateError("Cover image is required.");
      return;
    }

    if (!createTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }

    if (!createAuthor.trim()) {
      setCreateError("Author is required.");
      return;
    }

    setCreateLoading(true);

    try {
      const category = parseCategoryInput(createCategoryInput);

      // If R2 bucket is not configured, skip upload and continue with empty coverUrl.
      // This makes the admin form usable in local/dev where R2 env vars may be absent.
      let coverUrl = "";
      const coversBucket = process.env.NEXT_PUBLIC_R2_BUCKET_COVERS;
      if (coversBucket && createCover) {
        coverUrl = await uploadComicCover(createCover);
      } else if (!coversBucket && createCover) {
        setCreateWarning(
          "R2 covers bucket not configured — cover upload skipped. Configure NEXT_PUBLIC_R2_BUCKET_COVERS to enable uploads.",
        );
      }

      const comic = await createComic({
        title: createTitle.trim(),
        description: createDescription.trim(),
        coverUrl,
        author: createAuthor.trim(),
        status: createStatus,
        category,
      });

      saveComicContext(comic);
      setComicLibrary((prev) => [comic, ...prev.filter((item) => item.id !== comic.id)]);
      setSelectedComicId(comic.id);

      setCreateTitle("");
      setCreateDescription("");
      setCreateAuthor("");
      setCreateStatus("ongoing");
      setCreateCategoryInput("");
      setCreateCover(null);

      setActiveSubTab("add_chapter");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create comic.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddChapter = async (event: React.FormEvent) => {
    event.preventDefault();
    setChapterError(null);

    if (!selectedComic) {
      setChapterError("Select a comic before adding a chapter.");
      return;
    }

    if (!chapterTitle.trim()) {
      setChapterError("Chapter title is required.");
      return;
    }

    if (chapterImages.length === 0) {
      setChapterError("At least one chapter image is required.");
      return;
    }

    if (!orderConfirmed) {
      setChapterError("Please confirm the final page order before saving.");
      return;
    }

    setChapterLoading(true);

    try {
      const ordered = [...chapterImages].sort((a, b) => a.order - b.order);
      const imageUrls = await uploadChapterImages(ordered.map((entry) => entry.file));

      await createComicChapter({
        comicId: selectedComic.id,
        tenantKey: selectedComic.tenantKey,
        storyId: selectedComic.storyId,
        chapterNumber,
        title: chapterTitle.trim(),
        content: imageUrls,
      });

      setChapterTitle("");
      setChapterNumber(1);
      setOrderConfirmed(false);
      clearChapterImages();
    } catch (error) {
      setChapterError(error instanceof Error ? error.message : "Failed to create chapter.");
    } finally {
      setChapterLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Comic Management</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          Build comics in D1 with full metadata and upload covers/pages to Cloudflare R2.
        </p>
      </header>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab("create_comic")}
          className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
            activeSubTab === "create_comic"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Plus size={16} className="inline mr-2" />
          Create Main Comic
        </button>
        <button
          onClick={() => setActiveSubTab("add_chapter")}
          className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
            activeSubTab === "add_chapter"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Upload size={16} className="inline mr-2" />
          Create Chapter
        </button>
      </div>

      {activeSubTab === "create_comic" && (
        <div className="space-y-6">
          {createError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-6 py-4">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{createError}</p>
            </div>
          )}
          {createWarning && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-6 py-4">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{createWarning}</p>
            </div>
          )}

          <form
            onSubmit={handleCreateComic}
            className="space-y-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Title</span>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  placeholder="Enter comic title"
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Slug (Auto)</span>
                <input
                  type="text"
                  value={generatedSlug}
                  disabled
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Author</span>
                <input
                  type="text"
                  value={createAuthor}
                  onChange={(event) => setCreateAuthor(event.target.value)}
                  placeholder="Author name"
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Status</span>
                <select
                  value={createStatus}
                  onChange={(event) => setCreateStatus(event.target.value === "completed" ? "completed" : "ongoing")}
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="ongoing">ongoing</option>
                  <option value="completed">completed</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Description</span>
              <textarea
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="Enter comic description"
                rows={4}
                className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">
                Categories (comma separated)
              </span>
              <input
                type="text"
                value={createCategoryInput}
                onChange={(event) => setCreateCategoryInput(event.target.value)}
                placeholder="action, adventure, fantasy"
                className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Cover Image</span>
              <div className="mt-3 flex items-center gap-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCreateCover(event.target.files?.[0] ?? null)}
                  className="block text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                />
                {createCover && (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20">
                    <img src={URL.createObjectURL(createCover)} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">id: UUID (auto)</div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">view_count: 0 (auto)</div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">created_at: auto</div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">updated_at: auto</div>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all"
            >
              {createLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Comic...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Create Comic in D1
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeSubTab === "add_chapter" && (
        <div className="space-y-6">
          {chapterError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-6 py-4">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{chapterError}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Select Main Comic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Search</span>
                <div className="relative mt-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={comicSearch}
                    onChange={(event) => setComicSearch(event.target.value)}
                    placeholder="Search by title, slug, or author"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Category Filter</span>
                <select
                  value={comicCategoryFilter}
                  onChange={(event) => setComicCategoryFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All categories</option>
                  {availableCategoryFilters.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredComics.length === 0 && (
                <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                  No comics found. Create a comic in the first tab to start adding chapters.
                </div>
              )}
              {filteredComics.map((comic) => (
                <button
                  key={comic.id}
                  type="button"
                  onClick={() => setSelectedComicId(comic.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedComicId === comic.id
                      ? "bg-primary/10 border-l-4 border-primary"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{comic.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">slug: {comic.slug} | author: {comic.author}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    category: {comic.category.length > 0 ? comic.category.join(", ") : "none"}
                  </p>
                </button>
              ))}
            </div>

            {selectedComic && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                Selected comic: <span className="font-black">{selectedComic.title}</span> (story_id: {selectedComic.storyId})
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddChapter}
            className="space-y-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Chapter Title</span>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(event) => setChapterTitle(event.target.value)}
                  placeholder="Enter chapter title"
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Chapter Number</span>
                <input
                  type="number"
                  min={1}
                  value={chapterNumber}
                  onChange={(event) => setChapterNumber(Math.max(1, parseInt(event.target.value || "1", 10)))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Bulk Image Upload (R2)</span>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDropzoneActive(true);
                }}
                onDragLeave={() => setIsDropzoneActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDropzoneActive(false);
                  appendChapterImages(Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/")));
                }}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDropzoneActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                }`}
              >
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drag and drop images here</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or choose files manually</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => appendChapterImages(Array.from(event.target.files ?? []))}
                  className="mt-4 block mx-auto text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                />
              </div>
            </div>

            {chapterImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">
                    Visual Order (Drag cards to reorder)
                  </span>
                  <button
                    type="button"
                    onClick={clearChapterImages}
                    className="text-xs font-bold text-red-600 dark:text-red-400"
                  >
                    Clear all
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reorder pages by dragging cards, using Up/Down buttons, or focusing a card and pressing arrow keys.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {chapterImages.map((entry, index) => (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={() => setDragImageId(entry.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragImageId) {
                          moveByDrag(dragImageId, entry.id);
                        }
                        setDragImageId(null);
                        setOrderConfirmed(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                          event.preventDefault();
                          moveImageByDirection(entry.id, "up");
                        }
                        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                          event.preventDefault();
                          moveImageByDirection(entry.id, "down");
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Page ${entry.order}. Use arrow keys to reorder.`}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-900">
                        <img src={entry.preview} alt={`Page ${entry.order}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-3 py-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-slate-400" />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">Page {entry.order}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveImageByDirection(entry.id, "up")}
                            disabled={index === 0}
                            className="px-2 py-1 text-[11px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-40"
                            aria-label={`Move page ${entry.order} up`}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImageByDirection(entry.id, "down")}
                            disabled={index === chapterImages.length - 1}
                            className="px-2 py-1 text-[11px] font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-40"
                            aria-label={`Move page ${entry.order} down`}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChapterImage(entry.id)}
                            className="ml-auto text-xs font-bold text-red-600 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <input
                type="checkbox"
                checked={orderConfirmed}
                onChange={(event) => setOrderConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Final order check confirmed: I verified page sequence (Page 1 → Page {chapterImages.length || 1}) before saving to D1.
              </span>
            </label>

            <button
              type="submit"
              disabled={chapterLoading || !selectedComic}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all"
            >
              {chapterLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Chapter...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Save Chapter to D1
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
