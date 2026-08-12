"use client";

import Link from "next/link";
import { Plus, Edit, Trash2, Search, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
const ImageUploader = dynamic(() => import("@/components/admin/image-uploader"), {
  ssr: false,
});
import { getR2ImageUrl } from "@/lib/utils/image-url";
import { ROUTES } from "@/lib/constants/routes";
import { useAdminComics } from "@/hooks/features/use-admin-comics";
import { useAdminFormOptions } from "@/hooks/features/use-admin-form-options";
import { Modal } from "@/components/ui/modal";

export default function AdminComicsPage() {
  const {
    comics,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    setIsModalOpen,
    editingComic,
    title,
    setTitle,
    author,
    setAuthor,
    translator,
    setTranslator,
    category,
    setCategory,
    status,
    setStatus,
    coverUrl,
    setCoverUrl,
    submitting,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveComic,
    handleDeleteComic,
  } = useAdminComics();
  const { categories, authors, translators, loading: optionsLoading } = useAdminFormOptions();
  const optionsEmpty = authors.length === 0 && translators.length === 0;
  const canSaveComic = !submitting && !optionsLoading && !optionsEmpty && categories.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="text-orange-500" size={28} />
            Quản Lý Danh Sách Truyện
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý, thêm mới, cập nhật ảnh bìa R2 và xóa các bộ truyện trên hệ thống
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
          <Plus size={18} /> Thêm Truyện Mới
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tên truyện, tác giả..."
            aria-label="Tìm kiếm truyện"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <label className="sr-only" htmlFor="comic-status-filter">Lọc theo trạng thái</label>
        <select
          id="comic-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer shrink-0"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản (Published)</option>
          <option value="ongoing">Đang tiến hành (Ongoing)</option>
          <option value="completed">Đã hoàn thành (Completed)</option>
          <option value="draft">Bản nháp (Draft)</option>
        </select>
      </div>

      {/* Comics Table */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Ảnh Bìa R2</th>
                <th className="p-4">Tên Truyện</th>
                <th className="p-4">Tác Giả</th>
                <th className="p-4">Thể Loại</th>
                <th className="p-4">Lượt Xem</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comics.length > 0 ? (
                comics.map((comic) => (
                  <tr key={comic.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <img
                        src={getR2ImageUrl(comic.cover_url)}
                        alt={comic.title}
                        width={48}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-16 rounded-lg object-cover border border-slate-800 bg-slate-950"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ROUTES.PLACEHOLDER_COVER;
                        }}
                      />
                    </td>
                    <td className="p-4 font-bold text-white max-w-xs truncate">{comic.title}</td>
                    <td className="p-4 text-slate-300">{comic.author || "Chưa cập nhật"}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                        {comic.category || "Chưa cập nhật"}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-orange-400">
                      {comic.views?.toLocaleString() || 0}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          comic.status === "completed"
                            ? "success"
                            : comic.status === "published"
                            ? "default"
                            : "default"
                        }
                      >
                        {comic.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`${ROUTES.ADMIN.CHAPTERS}?comicId=${comic.id}`}>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" title="Quản lý chương">
                            <Layers size={14} /> Chương
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(comic)}
                          title="Sửa truyện"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteComic(comic.id, comic.title)}
                          title="Xóa truyện"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading ? "Đang tải danh sách truyện..." : "Không tìm thấy bộ truyện nào."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="dark"
        className="max-w-xl"
        title={editingComic ? "Chỉnh Sửa Bộ Truyện" : "Thêm Bộ Truyện Mới"}
      >
        <form onSubmit={handleSaveComic} className="space-y-4">
              <div>
                <label htmlFor="comic-title" className="block text-xs font-semibold text-slate-300 mb-1">Tên Truyện *</label>
                <input
                  id="comic-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên truyện..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label htmlFor="comic-author" className="block text-xs font-semibold text-slate-300 mb-1">
                  Tác Giả / Dịch Giả * <span className="text-slate-500 font-normal">(bắt buộc chọn 1)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    id="comic-author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Tác giả...</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                  <select
                    id="comic-translator"
                    value={translator}
                    onChange={(e) => setTranslator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Dịch giả (đội dịch)...</option>
                    {translators.map((tr) => (
                      <option key={tr.id} value={tr.name}>{tr.name}</option>
                    ))}
                  </select>
                </div>
                {optionsEmpty && (
                  <p className="text-[11px] text-orange-400 mt-1">
                    Chưa có tác giả hoặc dịch giả. Vui lòng thêm tác giả / dịch giả trước khi tạo truyện.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="comic-category" className="block text-xs font-semibold text-slate-300 mb-1">Thể Loại *</label>
                <select
                  id="comic-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Chọn thể loại...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-[11px] text-orange-400 mt-1">
                    Chưa có thể loại. Vui lòng thêm thể loại trước khi tạo truyện.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="comic-status" className="block text-xs font-semibold text-slate-300 mb-1">Trạng Thái</label>
                <select
                  id="comic-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="published">Đã xuất bản (Published)</option>
                  <option value="ongoing">Đang tiến hành (Ongoing)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Ảnh Bìa (Cloudflare R2 Bucket)
                </label>
                <ImageUploader
                  folder="covers"
                  onImagesUploaded={(urls) => {
                    if (urls.length > 0) setCoverUrl(urls[0]);
                  }}
                />
                {coverUrl && (
                  <p className="text-[11px] text-orange-400 mt-1 truncate">Đường dẫn R2: {coverUrl}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!canSaveComic}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {submitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
