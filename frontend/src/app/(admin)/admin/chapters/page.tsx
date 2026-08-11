"use client";

import { useSearchParams } from "next/navigation";
import { Layers, Plus, Edit, Trash2, Search, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const ImageUploader = dynamic(() => import("@/components/admin/image-uploader"), {
  ssr: false,
});
import { useAdminChapters } from "@/hooks/features/use-admin-chapters";
import { useModalA11y } from "@/hooks/common/use-modal-a11y";

export default function AdminChaptersPage() {
  const searchParams = useSearchParams();
  const initialComicId = searchParams.get("comicId") || "all";

  const {
    chapters,
    comics,
    selectedComicId,
    setSelectedComicId,
    loading,
    search,
    setSearch,
    isModalOpen,
    setIsModalOpen,
    editingChapter,
    targetComicId,
    setTargetComicId,
    chapterNumber,
    setChapterNumber,
    title,
    setTitle,
    images,
    setImages,
    submitting,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveChapter,
    handleDeleteChapter,
  } = useAdminChapters(initialComicId);
  const closeModalRef = useModalA11y(isModalOpen, () => setIsModalOpen(false));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="text-orange-500" size={28} />
            Quản Lý Các Chương Truyện
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý, tạo chương mới và tải ảnh trang đọc trực tiếp lên Cloudflare R2
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
          <Plus size={18} /> Thêm Chương Mới
        </Button>
      </div>

      {/* Comic Selector & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <BookOpen size={16} className="text-orange-500" />
          <span className="text-xs font-semibold text-slate-300">Chọn Truyện:</span>
          <label className="sr-only" htmlFor="chapter-comic-select">Chọn bộ truyện</label>
          <select
            id="chapter-comic-select"
            value={selectedComicId}
            onChange={(e) => setSelectedComicId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer max-w-xs"
          >
            <option value="all">Tất cả bộ truyện ({comics.length})</option>
            {comics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm số chương, tên chương..."
            aria-label="Tìm kiếm chương"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Chapters Table */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Số Chương</th>
                <th className="p-4">Tên Chương</th>
                <th className="p-4">Số Trang Ảnh R2</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {chapters.length > 0 ? (
                chapters.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-orange-400">Chapter {ch.chapter_number}</td>
                    <td className="p-4 font-semibold text-white">{ch.title || `Chương ${ch.chapter_number}`}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-400 font-mono font-bold">
                        {ch.images?.length || 0} trang ảnh
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {ch.created_at ? new Date(ch.created_at).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(ch)}
                          title="Sửa chương"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteChapter(ch.id, ch.chapter_number, ch.story_id)}
                          title="Xóa chương"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {loading ? "Đang tải danh sách chương..." : "Chưa có chương nào cho bộ truyện này."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Chapter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">
                {editingChapter ? "Chỉnh Sửa Chương" : "Thêm Chương Mới"}
              </h2>
              <button ref={closeModalRef} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label htmlFor="chapter-comic" className="block text-xs font-semibold text-slate-300 mb-1">Chọn Bộ Truyện *</label>
                <select
                  id="chapter-comic"
                  disabled={!!editingChapter}
                  value={targetComicId}
                  onChange={(e) => setTargetComicId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  {comics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="chapter-number" className="block text-xs font-semibold text-slate-300 mb-1">Số Chương *</label>
                  <input
                    id="chapter-number"
                    type="number"
                    required
                    min={1}
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="chapter-title" className="block text-xs font-semibold text-slate-300 mb-1">Tên Chương</label>
                  <input
                    id="chapter-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Chương mở đầu..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Các Trang Ảnh Chương (Tự động tải lên R2 Chapters Bucket)
                </label>
                <ImageUploader
                  folder="chapters"
                  onImagesUploaded={(urls) => {
                    setImages((prev) => [...prev, ...urls]);
                  }}
                />
                <p className="text-[11px] text-slate-400 mt-1">Đã chọn: {images.length} trang ảnh</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                  {submitting ? "Đang lưu..." : "Lưu Chương"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
