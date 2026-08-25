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
  author_id?: string | null;
  translator?: string;
  translator_id?: string | null;
  category?: string;
  tags?: string;
  cover_url?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  description?: string;
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
  const [authorId, setAuthorId] = useState("");
  const [translator, setTranslator] = useState("");
  const [translatorId, setTranslatorId] = useState("");
  const [categorySet, setCategorySet] = useState<Set<string>>(new Set());
  const [tagSet, setTagSet] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("published");
  const [coverUrl, setCoverUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComics = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("stories")
        .select("id, title, author, author_id, translator, translator_id, category, tags, cover_url, status, created_at, updated_at, description, views")
        .order("created_at", { ascending: false })
        .limit(500);

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
    setAuthorId("");
    setTranslator("");
    setTranslatorId("");
    setCategorySet(new Set());
    setTagSet(new Set());
    setDescription("");
    setStatus("published");
    setCoverUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comic: ComicItem) => {
    setEditingComic(comic);
    setTitle(comic.title);
    setAuthor(comic.author || "");
    setAuthorId(comic.author_id || "");
    setTranslator(comic.translator || "");
    setTranslatorId(comic.translator_id || "");
    setCategorySet(new Set(comic.category ? comic.category.split(",").map(c => c.trim()).filter(Boolean) : []));
    setTagSet(new Set(comic.tags ? comic.tags.split(",").map(t => t.trim()).filter(Boolean) : []));
    setDescription(comic.description || "");
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
    if (!author.trim() && !translator.trim()) {
      toast.error("Vui lòng chọn tác giả hoặc dịch giả");
      return;
    }
    if (categorySet.size === 0) {
      toast.error("Vui lòng chọn thể loại");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload: CreateComicInput = {
        title, author, author_id: authorId, translator, translator_id: translatorId,
        category: Array.from(categorySet).join(", "),
        tags: Array.from(tagSet).join(", "),
        description, status: status as CreateComicInput["status"], cover_url: coverUrl,
      };
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
    authorId,
    setAuthorId,
    translator,
    setTranslator,
    translatorId,
    setTranslatorId,
    categorySet,
    setCategorySet,
    tagSet,
    setTagSet,
    description,
    setDescription,
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
