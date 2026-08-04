"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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

  const handleSaveComic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên truyện");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (editingComic) {
        const { error } = await supabase
          .from("stories")
          .update({
            title,
            author,
            category,
            status,
            cover_url: coverUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingComic.id);

        if (error) throw error;
        toast.success("Cập nhật truyện thành công!");
      } else {
        const { error } = await supabase.from("stories").insert([
          {
            title,
            author,
            category,
            status,
            cover_url: coverUrl,
          },
        ]);

        if (error) throw error;
        toast.success("Tạo bộ truyện mới thành công!");
      }

      setIsModalOpen(false);
      loadComics();
    } catch (err: any) {
      toast.error(err.message || "Lưu truyện thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComic = async (id: string, titleName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bộ truyện "${titleName}"?`)) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;

      toast.success(`Đã xóa truyện "${titleName}"`);
      setComics((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Xóa truyện thất bại");
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
