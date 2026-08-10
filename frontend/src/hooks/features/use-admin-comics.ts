"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createComic, updateComic, deleteComic } from "@/lib/actions/comic.actions";
import type { CreateComicInput } from "@/lib/schemas/comic";
import { toast } from "sonner";

export interface ComicItem {
  id: string;
  title: string;
  author: string;
  category?: string;
  cover_url?: string | null;
  status: string;
  created_at: string;
  views?: number;
}

export function useAdminComics() {
  const [comics, setComics] = useState<ComicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComic, setEditingComic] = useState<ComicItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Fantasy");
  const [status, setStatus] = useState("published");
  const [coverUrl, setCoverUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComics = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("stories")
        .select("id, title, author, category, cover_url, status, created_at, views")
        .order("created_at", { ascending: false });

      if (data) {
        setComics(data as ComicItem[]);
      }
    } catch (err) {
      console.error("Failed to load admin comics:", err);
      toast.error("Không thể tải danh sách truyện");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComics();
  }, [loadComics]);

  const handleOpenCreateModal = () => {
    setEditingComic(null);
    setTitle("");
    setAuthor("");
    setCategory("Fantasy");
    setStatus("published");
    setCoverUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comic: ComicItem) => {
    setEditingComic(comic);
    setTitle(comic.title);
    setAuthor(comic.author || "");
    setCategory(comic.category || "Fantasy");
    setStatus(comic.status || "published");
    setCoverUrl(comic.cover_url || "");
    setIsModalOpen(true);
  };

  const handleSaveComic = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên truyện");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload: CreateComicInput = { title, author, category, status: status as CreateComicInput["status"], cover_url: coverUrl };
      const res = editingComic
        ? await updateComic(editingComic.id, payload)
        : await createComic(payload);
      if (res.success === false) {
        toast.error(res.error || "Không thể lưu truyện");
        return;
      }
      toast.success("Lưu truyện thành công");
      setIsModalOpen(false);
      setEditingComic(null);
      await loadComics();
    } catch (err) {
      toast.error((err as Error).message || "Không thể lưu truyện");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComic = async (id: string, titleName: string) => {
    if (!window.confirm(`Xóa truyện "${titleName}"?`)) return;

    try {
      const res = await deleteComic(id);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã xóa truyện");
      setComics((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error((err as Error).message || "Không thể xóa truyện");
    }
  };

  const filteredComics = comics.filter((comic) => {
    const matchSearch =
      comic.title.toLowerCase().includes(search.toLowerCase()) ||
      (comic.author && comic.author.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || comic.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return {
    comics: filteredComics,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    setIsModalOpen,
    editingComic,
    title,
    setTitle,
    author,
    setAuthor,
    category,
    setCategory,
    status,
    setStatus,
    coverUrl,
    setCoverUrl,
    submitting,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveComic,
    handleDeleteComic,
  };
}
