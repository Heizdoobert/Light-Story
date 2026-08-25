"use client";

// ponytail: no comments backend exists yet — honest placeholder instead of
// fabricated comments + silent data loss. Wire to a real API when one lands.
export const ChapterCommentsSection: React.FC<{
  chapterId: string;
  comicId: string;
  onLoginClick?: () => void;
}> = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10 my-8 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Bình luận
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tính năng bình luận đang được phát triển. Quay lại sau nhé!
        </p>
      </div>
    </div>
  );
};
