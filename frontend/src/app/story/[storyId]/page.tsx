"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft, BookOpen, Eye, List, Clock, User } from "lucide-react";

// Import Hook lấy dữ liệu từ API
import { useStoryDetail } from "@/hooks/useStoryDetail";

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();

  // ĐÃ SỬA: Bắt tham số 'storyId' vì thư mục của bạn giờ là [storyId]
  const storyId = params.storyId as string;

  // Gọi Hook để lấy dữ liệu
  const { data, isLoading, error } = useStoryDetail(storyId);

  // 1. MÀN HÌNH CHỜ (LOADING)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-6">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">
          Đang tải thông tin truyện...
        </p>
      </div>
    );
  }

  // 2. MÀN HÌNH LỖI (KHÔNG TÌM THẤY TRUYỆN)
  if (error || !data?.story) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-6">📭</div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
          Truyện không tồn tại
        </h1>
        <p className="text-slate-500 mb-8 text-center">
          Có thể truyện này đã bị xóa hoặc đường dẫn không chính xác.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-all"
        >
          Trở về Trang chủ
        </button>
      </div>
    );
  }

  const { story, chapters } = data;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft size={18} />
            Quay lại
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full md:w-[260px] shrink-0 mx-auto md:mx-0"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border-4 border-white dark:border-slate-800">
              <img
                src={
                  story.cover_url ||
                  `https://picsum.photos/seed/${story.id}/400/600`
                }
                alt={story.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase shadow-sm backdrop-blur-md ${story.status === "completed" ? "bg-emerald-500/90 text-white" : "bg-primary/90 text-white"}`}
                >
                  {story.status === "completed"
                    ? "Hoàn thành"
                    : "Đang cập nhật"}
                </span>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col"
          >
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-4 leading-tight">
              {story.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300">
                <User size={16} className="text-primary" />
                {story.author || "Đang cập nhật"}
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Eye size={16} className="text-blue-500" />
                {story.views.toLocaleString()} lượt xem
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <BookOpen size={18} className="text-primary" /> Tóm tắt nội dung
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                {story.description ||
                  "Chưa có nội dung tóm tắt cho bộ truyện này."}
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60">
              {chapters.length > 0 ? (
                <Link href={`/story/${storyId}/chapter/${chapters[0].id}`}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
                  >
                    <BookOpen size={20} />
                    Đọc từ Chương {chapters[0].chapter_number}
                  </motion.button>
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-10 py-4 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-xl font-bold cursor-not-allowed"
                >
                  Chưa có chương nào
                </button>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <List size={24} className="text-primary" />
              Danh sách chương
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
              Tổng số: {chapters.length} chương
            </span>
          </div>

          {chapters.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🚧</span>
              <p className="text-slate-500 font-medium text-lg">
                Đang chờ tác giả cập nhật chương mới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/story/${storyId}/chapter/${chapter.id}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex flex-col justify-between h-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-lg font-black text-primary border border-slate-200 dark:border-slate-700 shadow-sm">
                        {chapter.chapter_number}
                      </div>

                      <div className="flex flex-col overflow-hidden pt-1">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {chapter.title || `Chương ${chapter.chapter_number}`}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-2">
                          <Clock size={12} />
                          {new Date(chapter.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
