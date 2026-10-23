"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers, Plus, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const ImageUploader = dynamic(() => import("@/components/admin/image-uploader"), {
  ssr: false,
});
const CbzBatchImportModal = dynamic(() => import("@/components/admin/cbz-batch-import"), {
  ssr: false,
});
import { useAdminChapters } from "@/hooks/features/use-admin-chapters";
import { Modal } from "@/components/ui/modal";
import { AdminChaptersTable } from "@/components/admin/chapters/AdminChaptersTable";

export default function AdminChaptersPage() {
  const searchParams = useSearchParams();
  const initialComicId = searchParams.get("comicId") || "all";
  const [importOpen, setImportOpen] = useState(false);

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
    handleBulkCbzProcessed,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveChapter,
    handleDeleteChapter,
    refresh,
  } = useAdminChapters(initialComicId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="text-orange-500" size={28} />
            Quản Lý Các Chương Truyện
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý, tạo chương mới và tải ảnh trang đọc trực tiếp lên Cloudflare R2
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setImportOpen(true)}
            disabled={selectedComicId === "all"}
            title={selectedComicId === "all" ? "Chọn một bộ truyện trước khi nhập hàng loạt" : undefined}
            variant="outline"
            className="gap-2 font-bold shrink-0"
          >
            <FileArchive size={18} /> Nhập CBZ Hàng Loạt
          </Button>
          <Button onClick={handleOpenCreateModal} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
            <Plus size={18} /> Thêm Chương Mới
          </Button>
        </div>
      </div>

      {/* Chapters Table with Ant Design SDK */}
      <AdminChaptersTable
        chapters={chapters}
        loading={loading}
        comics={comics}
        selectedComicId={selectedComicId}
        onSelectComic={setSelectedComicId}
        searchValue={search}
        onSearchChange={setSearch}
        onEditChapter={handleOpenEditModal}
        onDeleteChapter={handleDeleteChapter}
      />

      {/* Create / Edit Chapter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="dark"
        className="max-w-xl"
        title={editingChapter ? "Chỉnh Sửa Chương" : "Thêm Chương Mới"}
      >
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
              bulkChapters={!editingChapter}
              onCbzName={(name) => {
                if (!editingChapter) setTitle(name);
              }}
              onCbzProcessed={handleBulkCbzProcessed}
              onImagesUploaded={(urls) => {
                if (!editingChapter) setImages((prev) => [...prev, ...urls]);
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
      </Modal>

      {/* CBZ Batch Import Modal */}
      <CbzBatchImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        comicId={selectedComicId === "all" ? null : selectedComicId}
        onComplete={() => void refresh()}
      />
    </div>
  );
}
