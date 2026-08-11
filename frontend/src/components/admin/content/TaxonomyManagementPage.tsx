"use client";

import { Layers, Tag, Plus, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminTaxonomy, type TaxonomyEntity } from "@/hooks/features/use-admin-taxonomy";
import { useModalA11y } from "@/hooks/common/use-modal-a11y";

const META: Record<TaxonomyEntity, { title: string; description: string; addLabel: string; itemLabel: string }> = {
  genre: {
    title: "Quản Lý Genres",
    description: "Danh mục genres phân loại nội dung truyện",
    addLabel: "Thêm Genre",
    itemLabel: "Genre",
  },
  tag: {
    title: "Quản Lý Thẻ Tag",
    description: "Danh mục thẻ tag gắn cho nội dung truyện",
    addLabel: "Thêm Tag",
    itemLabel: "Tag",
  },
};

export function TaxonomyManagementPage({ entity }: { entity: TaxonomyEntity }) {
  const meta = META[entity];
  const Icon = entity === "genre" ? Layers : Tag;
  const {
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
  } = useAdminTaxonomy(entity);
  const closeModalRef = useModalA11y(isModalOpen, () => setIsModalOpen(false));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Icon className="text-orange-500" size={28} />
            {meta.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{meta.description}</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
          <Plus size={18} /> {meta.addLabel}
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">STT</th>
                <th className="p-4">Tên {meta.itemLabel}</th>
                <th className="p-4">Mô Tả</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-4 font-bold text-white">{item.name}</td>
                    <td className="p-4 text-slate-400 max-w-[320px] truncate">{item.description || "—"}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(item)}>
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    {loading ? "Đang tải..." : `Chưa có ${meta.itemLabel.toLowerCase()} nào.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">
                {editingItem ? `Sửa ${meta.itemLabel}` : `Thêm ${meta.itemLabel} Mới`}
              </h2>
              <button ref={closeModalRef} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor={`${entity}-name`} className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên {meta.itemLabel} *
                </label>
                <input
                  id={`${entity}-name`}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Nhập tên ${meta.itemLabel.toLowerCase()}...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label htmlFor={`${entity}-description`} className="block text-xs font-semibold text-slate-300 mb-1">
                  Mô Tả
                </label>
                <textarea
                  id={`${entity}-description`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả ngắn (tùy chọn)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                  {submitting ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
