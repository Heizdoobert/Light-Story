"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
      const supabase = getSupabaseBrowserClient();
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({ name: name.trim(), slug })
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Cập nhật thể loại thành công!");
      } else {
        const { error } = await supabase.from("categories").insert([{ name: name.trim(), slug }]);
        if (error) throw error;
        toast.success("Thêm thể loại mới thành công!");
      }

      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Lưu thể loại thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thể loại "${name}"?`)) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      toast.success(`Đã xóa thể loại "${name}"`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Xóa thể loại thất bại");
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
