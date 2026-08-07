"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Search, Edit2, Trash2, Languages, Check, X, UserCheck, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";
import { createTranslator, updateTranslator, deleteTranslator } from "@/actions/translators.actions";
import { toast } from "sonner";
import type { ComicCmsRecord } from "@/services/comics/comicCms.service";

export type TranslatorRecord = {
  id: string;
  name: string;
  contact?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
};

type TranslatorApiRow = {
  id: string;
  name: string;
  contact?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const TRANSLATOR_STORAGE_KEY = "comic-cms:translators";

export function loadTranslators(): TranslatorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRANSLATOR_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TranslatorRecord[];
  } catch {
    return [];
  }
}

export function saveTranslators(translators: TranslatorRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSLATOR_STORAGE_KEY, JSON.stringify(translators));
  } catch (err) {
    console.error("Failed to save translators", err);
  }
}

type TranslatorManagementTabProps = {
  catalog: ComicCmsRecord[];
};

export const TranslatorManagementTab: React.FC<TranslatorManagementTabProps> = ({ catalog }) => {
  const [translators, setTranslators] = useState<TranslatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTranslators = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<TranslatorApiRow[]>("/api/admin/translators");
      if (Array.isArray(res)) {
        const mapped: TranslatorRecord[] = res.map((item) => ({
          id: item.id,
          name: item.name,
          contact: item.contact || "",
          notes: item.notes || "",
          status: item.status === "inactive" ? "inactive" : "active",
          createdAt: item.created_at ? String(item.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
        }));
        setTranslators(mapped);
        saveTranslators(mapped);
      } else {
        setTranslators(loadTranslators());
      }
    } catch {
      setTranslators(loadTranslators());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslators();
  }, []);

  // Count translated comics per translator
  const translatorComicCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    catalog.forEach((comic) => {
      const trans = comic.translator;
      if (trans) {
        map[trans] = (map[trans] || 0) + 1;
      }
    });
    return map;
  }, [catalog]);

  const filteredTranslators = useMemo(() => {
    return translators.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.contact && t.contact.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [translators, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName("");
    setContact("");
    setNotes("");
    setStatus("active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (translator: TranslatorRecord) => {
    setEditingId(translator.id);
    setName(translator.name);
    setContact(translator.contact || "");
    setNotes(translator.notes || "");
    setStatus(translator.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Vui lòng nhập tên người dịch / nhóm dịch");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      contact: contact.trim(),
      notes: notes.trim(),
      status,
    };

    try {
      const res = editingId
        ? await updateTranslator({ id: editingId, ...payload })
        : await createTranslator(payload);
      if (!res?.success) {
        toast.error(res?.error ?? "Operation failed");
        return;
      }
      toast.success(editingId ? "Cập nhật thông tin nhóm dịch thành công!" : "Tạo nhóm dịch mới thành công!");
      setIsModalOpen(false);
      await fetchTranslators();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm dịch "${name}" không?`)) {
      const res = await deleteTranslator({ id });
      if (!res?.success) {
        toast.error(res?.error ?? "Operation failed");
        return;
      }
      toast.success(`Đã xóa nhóm dịch "${name}"`);
      await fetchTranslators();
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Quản lý Nhóm Dịch / Người Dịch
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý danh sách các dịch giả, nhóm dịch thuật và trạng thái hoạt động trong hệ thống.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus size={16} /> Thêm Người Dịch Mới
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm người dịch, liên hệ..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {/* TRANSLATORS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="p-4">Tên Người Dịch / Nhóm Dịch</th>
                <th className="p-4">Thông tin liên hệ</th>
                <th className="p-4 text-center">Số truyện dịch</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Ghi chú</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span>Đang tải danh sách nhóm dịch...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTranslators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Không tìm thấy dịch giả nào.
                  </td>
                </tr>
              ) : (
                filteredTranslators.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-primary shrink-0" />
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {t.contact || "—"}
                    </td>
                    <td className="p-4 text-center font-bold text-primary">
                      {translatorComicCountMap[t.name] || 0}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          t.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {t.status === "active" ? (
                          <>
                            <Check className="w-3 h-3" /> Hoạt động
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" /> Tạm dừng
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[200px]">
                      {t.notes || "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Xóa nhóm dịch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingId ? "Chỉnh sửa Nhóm Dịch" : "Thêm Nhóm Dịch Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Người Dịch / Nhóm Dịch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Phong Vân Team"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thông tin liên hệ (Email / Discord / Facebook)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="VD: contact@phongvan.app"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm dừng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú thể loại dịch hoặc lịch ra chương..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? "Cập nhật" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
