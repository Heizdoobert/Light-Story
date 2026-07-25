"use client";

import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  ShieldAlert,
  Search,
  BookOpen,
  Layers,
  AlertTriangle,
} from "lucide-react";
import type { ComicCmsRecord } from "@/services/comics/comicCms.service";
import { toast } from "sonner";

export type TrashItem = {
  id: string;
  type: "comic" | "chapter";
  title: string;
  comicTitle?: string;
  chapterNumber?: number;
  deletedAt: string;
  deletedBy: string;
};

type ComicTrashTabProps = {
  catalog: ComicCmsRecord[];
  role: string | null;
  onRestoreComic?: (comicId: string) => void;
  onHardDeleteComic?: (comicId: string) => void;
};

export const ComicTrashTab: React.FC<ComicTrashTabProps> = ({
  catalog,
  role,
  onRestoreComic,
  onHardDeleteComic,
}) => {
  const isSuperAdmin = role === "superadmin";

  const realArchivedItems: TrashItem[] = React.useMemo(() => {
    return catalog
      .filter((record) => record.status === "archived")
      .map((record) => ({
        id: record.id,
        type: "comic",
        title: record.title,
        deletedAt: record.lastUpdatedAt || new Date().toISOString(),
        deletedBy: record.author || "System User",
      }));
  }, [catalog]);

  const [trashItems, setTrashItems] = useState<TrashItem[]>(realArchivedItems);

  const [searchQuery, setSearchQuery] = useState("");

  const handleRestore = (item: TrashItem) => {
    setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.type === "comic" && onRestoreComic) {
      onRestoreComic(item.id);
    } else {
      toast.success(`Đã khôi phục thành công: ${item.title}`);
    }
  };

  const handleHardDelete = (item: TrashItem) => {
    if (!isSuperAdmin) {
      toast.error("Chỉ Super Admin mới có quyền xóa vĩnh viễn dữ liệu!");
      return;
    }
    setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.type === "comic" && onHardDeleteComic) {
      onHardDeleteComic(item.id);
    } else {
      toast.success(`Đã xóa vĩnh viễn: ${item.title}`);
    }
  };

  const filteredItems = trashItems.filter((item) => {
    // Uploaders only see deleted chapters, not deleted full comics (only admins see deleted full comics)
    if (!isSuperAdmin && role !== "admin" && item.type === "comic") {
      return false;
    }
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.comicTitle && item.comicTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER & SECURITY BANNER */}
      <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/60 pb-3">
          <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 font-black text-base">
            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
            Thùng rác & Bảo vệ Dữ liệu (Soft Delete Workspace)
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
            ⏱️ Tự động xóa vĩnh viễn sau 30 ngày
          </span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Tất cả truyện và chương khi bấm xóa chỉ được chuyển vào Thùng rác (Soft Delete). Nhân viên chỉ có quyền <strong>Khôi phục (Restore)</strong> các chương do chính mình xóa. Nút <strong>Xóa vĩnh viễn (Empty Trash)</strong> bị khóa hoàn toàn và chỉ được dùng bởi <strong>Super Admin</strong>.
        </p>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500">
          Danh sách mục trong thùng rác ({trashItems.length})
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs">
          <Search size={14} className="text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên mục..."
            className="bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </label>
      </div>

      {/* TRASH ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-12 text-center text-xs font-semibold text-slate-400">
          Thùng rác trống. Không có truyện hay chương nào bị ẩn.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 shrink-0">
                  {item.type === "comic" ? <BookOpen size={18} /> : <Layers size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                      {item.type === "comic" ? "Truyện" : "Chương"}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                  </div>
                  {item.comicTitle && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Thuộc bộ: {item.comicTitle}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-1">
                    Xóa lúc: {new Date(item.deletedAt).toLocaleString()} bởi <strong>{item.deletedBy}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRestore(item)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500 hover:text-white transition shadow-sm"
                >
                  <RotateCcw size={14} /> Khôi phục (Restore)
                </button>

                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleHardDelete(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500 hover:text-white transition shadow-sm"
                  >
                    <Trash2 size={14} /> Xóa vĩnh viễn
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 text-[11px] font-medium" title="Chỉ Super Admin mới có quyền xóa hẳn">
                    <AlertTriangle size={12} /> Khóa xóa hẳn
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
