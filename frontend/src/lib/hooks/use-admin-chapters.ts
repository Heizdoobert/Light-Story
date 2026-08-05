"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
        .order("title");

      if (comicsData) {
        setComics(comicsData);
        if (!targetComicId && comicsData.length > 0) {
          setTargetComicId(comicsData[0].id);
        }
      }

      let query = supabase
        .from("chapters")
        .select("id, story_id, chapter_number, title, created_at, images")
        .order("chapter_number", { ascending: false });

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
      toast.error("Vui lòng chọn bộ truyện");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let targetChapterId = editingChapter?.id;

      if (editingChapter) {
        const { error } = await supabase
          .from("chapters")
          .update({
            chapter_number: Number(chapterNumber),
            title,
            images,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingChapter.id);

        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("chapters")
          .insert([
            {
              story_id: targetComicId,
              chapter_number: Number(chapterNumber),
              title,
              images,
            },
          ])
          .select("id")
          .single();

        if (error) throw error;
        if (inserted) targetChapterId = inserted.id;
      }

      // Sync to chapter_images table for public reader compatibility
      if (targetChapterId && images.length > 0) {
        await supabase.from("chapter_images").delete().eq("chapter_id", targetChapterId);
        const chapterImageRows = images.map((imgUrl, index) => ({
          chapter_id: targetChapterId,
          image_url: imgUrl,
          page_number: index + 1,
        }));
        await supabase.from("chapter_images").insert(chapterImageRows);
      }

      toast.success(editingChapter ? "Cập nhật chương thành công!" : "Tạo chương mới thành công!");
      setIsModalOpen(false);
      loadInitialData();
    } catch (err: any) {
      toast.error(err.message || "Lưu chương thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChapter = async (id: string, chNum: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Chương ${chNum}?`)) return;

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from("chapter_images").delete().eq("chapter_id", id);
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;

      toast.success(`Đã xóa Chương ${chNum}`);
      setChapters((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Xóa chương thất bại");
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
