"use client";

import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface BookmarkButtonProps {
  comicId: string;
  className?: string;
}

export function BookmarkButton({ comicId: _comicId, className = '' }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border-2',
        isBookmarked
          ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:text-amber-500',
        className,
      )}
    >
      <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-current')} />
      <span>{isBookmarked ? 'Đang theo dõi' : 'Theo dõi'}</span>
    </button>
  );
}

export default BookmarkButton;
