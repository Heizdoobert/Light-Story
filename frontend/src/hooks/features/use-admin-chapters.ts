"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createChapter, updateChapter, deleteChapter } from "@/lib/actions/chapter.actions";
import { toast } from "sonner";

export interface ChapterItem {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  images?: string[];
}

export interface ComicSimple {
  id: string;
  title: string;
}

export function useAdminChapters(initialComicId: string = "all") {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [comics, setComics] = useState<ComicSimple[]>([]);
  const [selectedComicId, setSelectedComicId] = useState<string>(initialComicId);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterItem | null>(null);

  // Form State
  const [targetComicId, setTargetComicId] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      const { data: comicsData } = await supabase
        .from("stories")
        .select("id, title")
        .order("title")
        .limit(500);

      if (comicsData) {
        setComics(comicsData);
        if (!targetComicId && comicsData.length > 0) {
          setTargetComicId(comicsData[0].id);
        }
      }

      let query = supabase
        .from("chapters")
        .select("id, story_id, chapter_number, title, created_at, images")
        .order("chapter_number", { ascending: false })
        .limit(500);

      if (selectedComicId !== "all") {
        query = query.eq("story_id", selectedComicId);
      }

      const { data: chaptersData } = await query;
      if (chaptersData) {
        setChapters(chaptersData as ChapterItem[]);
      }
    } catch (err) {
      console.error("Failed to load admin chapters:", err);
      toast.error("Không thể tải danh sách chương");
    } finally {
      setLoading(false);
    }
  }, [selectedComicId, targetComicId]);

  useEffect(() => {
    loadInitialData();
  }, [selectedComicId, loadInitialData]);

  const handleOpenCreateModal = () => {
    setEditingChapter(null);
    setChapterNumber(chapters.length > 0 ? chapters[0].chapter_number + 1 : 1);
    setTitle("");
    setImages([]);
    if (selectedComicId !== "all") {
      setTargetComicId(selectedComicId);
    } else if (comics.length > 0) {
      setTargetComicId(comics[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (chapter: ChapterItem) => {
    setEditingChapter(chapter);
    setTargetComicId(chapter.story_id);
    setChapterNumber(chapter.chapter_number);
    setTitle(chapter.title || "");
    setImages(chapter.images || []);
    setIsModalOpen(true);
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetComicId) {
      toast.error("Vui lòng chọn truyện");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = { chapter_number: Number(chapterNumber), title, images };
      const res = editingChapter
        ? await updateChapter(editingChapter.id, targetComicId, payload)
        : await createChapter({ story_id: targetComicId, ...payload });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Lưu chương thành công");
      await loadInitialData();
      setEditingChapter(null);
      setIsModalOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Không thể lưu chương");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChapter = async (id: string, chNum: number, storyId: string) => {
    if (!window.confirm(`Xóa chương #${chNum}?`)) return;

    try {
      const res = await deleteChapter(id, storyId);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã xóa chương");
      await loadInitialData();
    } catch (err) {
      toast.error((err as Error).message || "Không thể xóa chương");
    }
  };

  const filteredChapters = chapters.filter((ch) => {
    const matchSearch =
      ch.title.toLowerCase().includes(search.toLowerCase()) ||
      String(ch.chapter_number).includes(search);
    return matchSearch;
  });

  return {
    chapters: filteredChapters,
    comics,
    selectedComicId,
    setSelectedComicId,
    loading,
    search,
    setSearch,
    isModalOpen,
    setIsModalOpen,
    editingChapter,
    targetComicId,
    setTargetComicId,
    chapterNumber,
    setChapterNumber,
    title,
    setTitle,
    images,
    setImages,
    submitting,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveChapter,
    handleDeleteChapter,
  };
}
