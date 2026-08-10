"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import {
  createGenre,
  updateGenre,
  deleteGenre,
  createTag,
  updateTag,
  deleteTag,
} from "@/actions/taxonomy.actions";

export type TaxonomyEntity = "genre" | "tag";

export interface TaxonomyItem {
  id: string;
  name: string;
  description?: string | null;
}

const ACTIONS: Record<
  TaxonomyEntity,
  { create: typeof createGenre; update: typeof updateGenre; del: typeof deleteGenre }
> = {
  genre: { create: createGenre, update: updateGenre, del: deleteGenre },
  tag: { create: createTag, update: updateTag, del: deleteTag },
};

export function useAdminTaxonomy(entity: TaxonomyEntity) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<TaxonomyItem[]>(ROUTES.API.ADMIN.TAXONOMY(entity));
      if (Array.isArray(res)) setItems(res);
    } catch (err) {
      console.error(`Failed to load ${entity}s:`, err);
      toast.error("Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: TaxonomyItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description ?? "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || null };
      const res = editingItem
        ? await ACTIONS[entity].update({ id: editingItem.id, ...payload })
        : await ACTIONS[entity].create(payload);
      if (res.success === false) {
        toast.error(res.error || "Không thể lưu");
        return;
      }
      toast.success("Đã lưu");
      setIsModalOpen(false);
      setEditingItem(null);
      setName("");
      setDescription("");
      load();
    } catch (err) {
      toast.error((err as Error).message || "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Xóa "${itemName}"?`)) return;
    try {
      const res = await ACTIONS[entity].del({ id });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success(`Đã xóa "${itemName}"`);
      load();
    } catch (err) {
      toast.error((err as Error).message || "Xóa thất bại");
    }
  };

  return {
    items,
    loading,
    isModalOpen,
    setIsModalOpen,
    editingItem,
    name,
    setName,
    description,
    setDescription,
    submitting,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
  };
}
