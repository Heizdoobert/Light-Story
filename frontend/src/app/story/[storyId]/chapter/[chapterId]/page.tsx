"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, Info } from "lucide-react";

import { useChapterDetail } from "@/hooks/useChapterDetail";

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();

  const storyId = params.storyId as string;
  const chapterId = params.chapterId as string;

  const { data: chapter, isLoading, error } = useChapterDetail(chapterId);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-6">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">
          Đang tải ảnh chapter...
        </p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-black text-white mb-2">Lỗi tải dữ liệu</h1>
        <p className="text-slate-500 mb-8">
          Không thể tìm thấy nội dung của chương này.
        </p>
        <button
          onClick={() => router.back()}
          className="px-8 py-3 bg-primary text-white rounded-full font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const images: string[] = chapter.image_urls || chapter.images || [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/50 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/story/${storyId}`)}
            className="flex items-center gap-2 p-2 text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center flex-1 truncate px-4">
            <h1 className="text-base font-bold text-white truncate">
              {chapter.title || `Chương ${chapter.chapter_number}`}
            </h1>
          </div>
          <button className="p-2 text-slate-300 hover:text-white">
            <Info size={22} />
          </button>
        </div>
      </nav>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center bg-black min-h-screen">
        {images.length > 0 ? (
          images.map((imgUrl, index) => (
            <motion.img
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              src={imgUrl}
              alt={`Page ${index + 1}`}
              className="w-full h-auto object-contain block"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ))
        ) : (
          <div className="py-20 text-slate-500 text-center">
            <p>Chưa có ảnh nào được cập nhật cho chương này.</p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="max-w-3xl mx-auto p-6 mt-8 flex justify-center border-t border-zinc-800/50">
          <button
            onClick={() => window.scrollTo(0, 0)}
            className="px-6 py-2.5 bg-zinc-800 text-slate-300 rounded-full text-sm font-bold hover:bg-zinc-700 transition-colors"
          >
            Cuộn lên đầu trang
          </button>
        </div>
      )}
    </div>
  );
}
