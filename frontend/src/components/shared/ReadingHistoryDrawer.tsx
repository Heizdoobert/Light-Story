"use client";

import React from 'react';
import Link from 'next/link';
import { History, X, BookOpen } from 'lucide-react';
import { useReadingHistory } from '@/hooks/useReadingHistory';

type ReadingHistoryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ReadingHistoryDrawer: React.FC<ReadingHistoryDrawerProps> = ({ isOpen, onClose }) => {
  const { history, isLoading } = useReadingHistory();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <History className="w-5 h-5 text-primary" />
            <span>Lịch sử đọc truyện</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <p className="text-slate-400 text-center py-8">Đang tải...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Bạn chưa đọc truyện nào.</p>
          ) : (
            history.map((item) => (
              <Link
                key={`${item.comicId}-${item.chapterId}`}
                href={`/comics/${item.comicId}/chapter/${item.chapterId}`}
                onClick={onClose}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary transition line-clamp-1">
                      {item.comicId}
                    </h4>
                    <p className="text-[11px] text-slate-400">Đã đọc Chương {item.chapterNumber}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
