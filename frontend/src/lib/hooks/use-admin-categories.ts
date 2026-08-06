"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories.actions";

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export function useAdminCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CategoryItem[]>("/api/categories").catch(() => null);
      if (res && Array.isArray(res)) {
        setCategories(res);
      } else {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from("categories").select("id, name, slug");
        if (data) setCategories(data as CategoryItem[]);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên thể loại");
      return;
    }

    setSubmitting(true);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const res = editingCategory
        ? await updateCategory(editingCategory.id, { name: name.trim(), slug })
        : await createCategory({ name: name.trim(), slug });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }

      toast.success("Đã lưu thể loại");
      setIsModalOpen(false);
      setName("");
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      toast.error((err as Error).message || "Lưu thể loại thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thể loại "${name}"?`)) return;

    try {
      const res = await deleteCategory(id);
      if (res.success === false) {
        toast.error(res.error);
        return;
      }

      toast.success(`Đã xóa thể loại "${name}"`);
      loadCategories();
    } catch (err) {
      toast.error((err as Error).message || "Xóa thể loại thất bại");
    }
  };

  return {
    categories,
    loading,
    isModalOpen,
    setIsModalOpen,
    editingCategory,
    name,
    setName,
    submitting,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveCategory,
    handleDeleteCategory,
  };
}
