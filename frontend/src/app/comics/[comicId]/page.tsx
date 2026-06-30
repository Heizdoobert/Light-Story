"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  BookOpen,
  Clock,
  Eye,
  List,
  User,
  Tag,
  ChevronRight,
  ArrowLeft,
  Play,
} from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { ComicContext as Comic } from "@/services/comic.service";
import { Chapter } from "@/types/entities";
import { Header } from "@/components/shared/Header";
import { toast } from "sonner";
import { LoginModal } from "@/components/shared/LoginModal";

const getVietnameseStatus = (status: string) => {
  if (status === "completed") return "Hoàn thành";
  if (status === "ongoing") return "Đang cập nhật";
  if (status === "published") return "Đã xuất bản";
  if (status === "draft") return "Bản nháp";
  return "Đang cập nhật";
};

export default function ComicDetailPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const params = useParams();
  const comicId = params.comicId as string;

  const [comic, setComic] = useState<Comic | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComicDetail = async () => {
      try {
        const comicRes = await apiClient.get<any>(`/api/comics/${comicId}`);
        const comicData = Array.isArray(comicRes)
          ? comicRes[0]
          : comicRes?.comic || comicRes;
        setComic(comicData);

        const chaptersRes = await apiClient
          .get<any>(`/api/comics/${comicId}/chapters`)
          .catch(() => []);
        const chaptersData: Chapter[] = Array.isArray(chaptersRes)
          ? chaptersRes
          : chaptersRes?.items || chaptersRes?.chapters || [];

        // Sắp xếp lấy chương mới nhất lên đầu (chỉ sử dụng created_at chuẩn Supabase)
        const sortedChapters = chaptersData.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );
        setChapters(sortedChapters);
      } catch (error) {
        console.error("Lỗi tải chi tiết truyện:", error);
        toast.error("Không thể tải thông tin truyện.");
      } finally {
        setLoading(false);
      }
    };

    if (comicId) fetchComicDetail();
  }, [comicId]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "https://placehold.co/400x600/png?text=No+Cover";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
          Không tìm thấy truyện
        </h1>
        <Link href="/" className="px-6 py-2 bg-primary text-white rounded-full">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const coverUrl =
    comic.coverUrl || "https://placehold.co/400x600/png?text=No+Cover";

  const latestChapter = chapters.length > 0 ? chapters[0] : null;
  const firstChapter =
    chapters.length > 0 ? chapters[chapters.length - 1] : null;

  // 👇 XỬ LÝ CHUẨN HÓA LỖI TRẢ VỀ CỦA CATEGORY 👇
  let categoryArray: string[] = [];
  if (comic.category) {
    if (Array.isArray(comic.category)) {
      categoryArray = comic.category;
    } else if (typeof comic.category === "string") {
      try {
        const parsed = JSON.parse(comic.category);
        categoryArray = Array.isArray(parsed) ? parsed : [comic.category];
      } catch {
        categoryArray = (comic.category as string)
          .split(",")
          .map((c) => c.trim());
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500 pb-20">
      <Header
        onMenuClick={() => {}}
        onLoginClick={() => setIsLoginModalOpen(true)}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <div className="relative w-full h-[40vh] sm:h-[50vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50 dark:opacity-30"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950/80 to-transparent" />

        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full text-slate-800 dark:text-white font-semibold hover:bg-white/40 transition"
          >
            <ArrowLeft size={18} /> Trở về
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-48 relative z-20">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          <div className="flex-shrink-0 flex flex-col items-center sm:items-start w-48 sm:w-64 mx-auto sm:mx-0">
            <motion.img
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              src={coverUrl}
              alt={comic.title}
              onError={handleImageError}
              className="w-full aspect-[3/4] object-cover rounded-2xl shadow-2xl shadow-primary/20 border-4 border-white dark:border-slate-800"
            />

            <div className="w-full mt-6 space-y-3">
              <Link
                href={
                  firstChapter
                    ? `/comics/${comicId}/chapter/${firstChapter.id}`
                    : "#"
                }
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold transition-all shadow-lg ${firstChapter ? "bg-primary text-white hover:bg-primary/90 hover:-translate-y-1" : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"}`}
              >
                <BookOpen size={18} /> Đọc từ đầu
              </Link>

              <Link
                href={
                  latestChapter
                    ? `/comics/${comicId}/chapter/${latestChapter.id}`
                    : "#"
                }
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold transition-all border-2 ${latestChapter ? "border-primary text-primary hover:bg-primary hover:text-white" : "border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed"}`}
              >
                <Play size={18} /> Đọc mới nhất
              </Link>
            </div>
          </div>

          <div className="flex-1 pt-2 sm:pt-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${comic.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}
                >
                  {getVietnameseStatus(comic.status)}
                </span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <Eye size={16} /> {(comic.viewCount || 0).toLocaleString()}{" "}
                  lượt xem
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4">
                {comic.title}
              </h1>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium mb-6">
                <User size={18} className="text-primary" />
                Tác giả:{" "}
                <span className="text-slate-900 dark:text-white font-bold">
                  {comic.author || "Đang cập nhật"}
                </span>
              </div>

              {/* Sử dụng mảng categoryArray đã được xử lý */}
              {categoryArray.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <Tag size={16} className="text-slate-400" />
                  {categoryArray.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-primary transition cursor-pointer"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <List size={18} className="text-primary" /> Tóm tắt nội dung
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {comic.description || "Truyện chưa có mô tả."}
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 sm:mt-16 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <List className="text-primary" /> Danh sách chương
            </h2>
            <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {chapters.length} Chương
            </span>
          </div>

          {chapters.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              Truyện chưa cập nhật chương nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/comics/${comicId}/chapter/${chapter.id}`}
                  className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 hover:bg-white dark:hover:bg-slate-800 hover:border-primary/50 transition-all hover:shadow-md"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-primary transition">
                      {chapter.chapter_number
                        ? `Chương ${chapter.chapter_number}`
                        : chapter.title}
                      {chapter.title &&
                        chapter.title !== `Chương ${chapter.chapter_number}` &&
                        ` - ${chapter.title}`}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(
                          chapter.created_at || Date.now(),
                        ).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
