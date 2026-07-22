"use client";

import React from 'react';
import { Bookmark } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { toast } from 'sonner';

type BookmarkButtonProps = {
  comicId: string;
  className?: string;
};

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comicId, className = '' }) => {
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks();
  const bookmarked = isBookmarked(comicId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const state = await toggleBookmark(comicId);
      toast.success(state ? 'Đã thêm vào danh sách theo dõi!' : 'Đã bỏ theo dõi!');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border-2 ${
        bookmarked
          ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:text-amber-500'
      } ${className}`}
    >
      <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
      <span>{bookmarked ? 'Đang theo dõi' : 'Theo dõi'}</span>
    </button>
  );
};
