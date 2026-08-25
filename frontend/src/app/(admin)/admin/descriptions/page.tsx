"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlignLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminComics } from "@/hooks/features/use-admin-comics";
import { updateComic } from "@/lib/actions/comic.actions";

export default function AdminDescriptionsPage() {
  const { comics, loading, search, setSearch } = useAdminComics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = comics.find((c) => c.id === selectedId);

  const handleSelect = (id: string) => {
    const comic = comics.find((c) => c.id === id);
    if (!comic) return;
    setSelectedId(id);
    setDescription(comic.description || "");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await updateComic(selectedId, { description });
      if (res.success) {
        toast.success("Lưu mô tả thành công");
      } else {
        toast.error(res.error || "Lưu mô tả thất bại");
      }
    } catch {
      toast.error("Lưu mô tả thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <AlignLeft className="text-orange-500" size={28} />
          Mô Tả Truyện
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Chọn truyện để chỉnh sửa mô tả chi tiết
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm tên truyện..."
          aria-label="Tìm kiếm truyện"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Comic List */}
        <div className="w-full lg:w-1/2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Danh sách truyện</caption>
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-4">Tên Truyện</th>
                  <th className="p-4 hidden sm:table-cell">Tác Giả</th>
                  <th className="p-4 hidden md:table-cell">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comics.length > 0 ? (
                  comics.map((comic) => (
                    <tr
                      key={comic.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(comic.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(comic.id); } }}
                      aria-label={`Chọn ${comic.title}`}
                      className={`cursor-pointer transition-colors ${
                        selectedId === comic.id
                          ? "bg-orange-500/10 border-l-2 border-l-orange-500"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="p-4 font-bold text-white max-w-[200px] truncate">
                        {comic.title}
                      </td>
                      <td className="p-4 text-slate-300 hidden sm:table-cell">
                        {comic.author || "—"}
                      </td>
                      <td className="p-4 text-slate-500 max-w-[200px] truncate hidden md:table-cell">
                        {comic.description ? (
                          <span className="text-slate-400">{comic.description.slice(0, 60)}...</span>
                        ) : (
                          <span className="italic">Chưa có mô tả</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      {loading ? "Đang tải..." : "Không tìm thấy truyện."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description Editor */}
        <div className="w-full lg:w-1/2">
          {selected ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selected.author || "Chưa cập nhật tác giả"}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="comic-description" className="text-xs font-bold text-slate-300">
                  Mô tả nội dung
                </label>
                <textarea
                  id="comic-description"
                  rows={12}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả chi tiết cho bộ truyện..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold"
                >
                  <Save size={16} />
                  {saving ? "Đang lưu..." : "Lưu Mô Tả"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex items-center justify-center">
              <p className="text-slate-500 text-sm">
                Chọn một truyện bên trái để chỉnh sửa mô tả
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
