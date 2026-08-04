"use client";

import { useEffect, useState } from "react";
import { Tags, Plus, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
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
  };

  useEffect(() => {
    loadCategories();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tags className="text-orange-500" size={28} />
            Quản Lý Thể Loại Truyện
          </h1>
          <p className="text-sm text-slate-500 mt-1">Danh mục các thể loại phân loại nội dung truyện</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
          <Plus size={18} /> Thêm Thể Loại
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">STT</th>
                <th className="p-4">Tên Thể Loại</th>
                <th className="p-4">Slug</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.length > 0 ? (
                categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-4 font-bold text-white">{cat.name}</td>
                    <td className="p-4 font-mono text-cyan-400">{cat.slug || cat.name.toLowerCase()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(cat)}>
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {loading ? "Đang tải thể loại..." : "Chưa có thể loại nào."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">{editingCategory ? "Sửa Thể Loại" : "Thêm Thể Loại Mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Thể Loại *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên thể loại (vd: Hành Động)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                  {submitting ? "Đang lưu..." : "Lưu Thể Loại"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
