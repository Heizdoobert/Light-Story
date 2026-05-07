"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createComicChapter, loadComicContext, type ComicContext, uploadChapterImages } from "@/services/comic.service";

type ImageEntry = {
  id: string;
  file: File;
  order: number;
  preview: string;
};

export default function AddChapter({ params }: { params: { comicId: string } }) {
  const router = useRouter();
  const { comicId } = params;
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [comicContext, setComicContext] = useState<ComicContext | null>(null);
  const [comicError, setComicError] = useState<string | null>(null);

  useEffect(() => {
    const next = loadComicContext(comicId);
    setComicContext(next);
    if (!next) {
      setComicError("Comic context was not found. Please create the comic again from the dashboard.");
    }
  }, [comicId]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = Array.from(fileList).map((f, idx) => ({
      id: crypto.randomUUID(),
      file: f,
      order: images.length + idx + 1,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...next]);
  };

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const copy = [...prev];
      const i = copy.findIndex((it) => it.id === id);
      if (i === -1) return prev;
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= copy.length) return prev;
      // swap orders
      [copy[i], copy[j]] = [copy[j], copy[i]];
      // normalize order values to 1..n
      return copy.map((it, idx) => ({ ...it, order: idx + 1 }));
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((it) => it.id !== id).map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const setImageOrder = (id: string, newOrder: number) => {
    setImages((prev) => {
      const copy = prev.map((it) => (it.id === id ? { ...it, order: newOrder } : it));
      // sort by order then normalize
      copy.sort((a, b) => a.order - b.order);
      return copy.map((it, idx) => ({ ...it, order: idx + 1 }));
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comicContext) return alert("Comic context was not found");
    if (images.length === 0) return alert("Select at least one image");
    setLoading(true);

    const ordered = [...images].sort((a, b) => a.order - b.order);
    const urls = await uploadChapterImages(ordered.map((entry) => entry.file));

    try {
      await createComicChapter({
        comicId,
        tenantKey: comicContext.tenantKey,
        storyId: comicContext.storyId,
        chapterNumber,
        title,
        content: urls,
      });
      alert("Chapter added!");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add chapter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-extrabold mb-4">Add Chapter</h2>
      {comicError && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{comicError}</p>}
      <form onSubmit={handleAdd} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Chapter Title</span>
            <input className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" placeholder="Chapter Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Chapter Number</span>
            <input type="number" min={1} value={chapterNumber} onChange={(e) => setChapterNumber(parseInt(e.target.value || '1', 10))} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
          </label>
        </div>

        <div>
          <label className="text-sm text-slate-700 dark:text-slate-300">Images</label>
          <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="mt-2 block" />
        </div>

        {images.length > 0 && (
          <div className="space-y-2">
            {images.map((img) => (
              <div key={img.id} className="flex items-center gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <img src={img.preview} className="w-20 h-20 object-cover rounded" alt="preview" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">Image {img.order}</div>
                    <input type="number" min={1} max={images.length} value={img.order} onChange={(e) => setImageOrder(img.id, Math.max(1, Math.min(images.length, parseInt(e.target.value || '1', 10))))} className="w-20 rounded px-2 py-1 border" />
                    <button type="button" onClick={() => moveImage(img.id, 'up')} className="ml-2 px-2 py-1 bg-slate-200 rounded">Up</button>
                    <button type="button" onClick={() => moveImage(img.id, 'down')} className="px-2 py-1 bg-slate-200 rounded">Down</button>
                    <button type="button" onClick={() => removeImage(img.id)} className="ml-auto text-red-500">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <button type="submit" disabled={loading || !comicContext} className="w-full inline-flex items-center justify-center rounded-md bg-primary-600 text-white py-2 px-4 disabled:opacity-60">
            {loading ? 'Saving…' : 'Add Chapter'}
          </button>
        </div>
      </form>
    </section>
  );
}