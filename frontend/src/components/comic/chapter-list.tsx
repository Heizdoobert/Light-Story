"use client";

import Link from 'next/link';
import { formatDate } from '@/lib/utils/format-date';

export interface ChapterItem {
  id: string;
  chapter_number: number;
  title?: string;
  created_at: string;
}

export interface ChapterListProps {
  comicId: string;
  chapters: ChapterItem[];
}

export function ChapterList({ comicId, chapters }: ChapterListProps) {
  if (!chapters || chapters.length === 0) {
    return <p className="text-sm text-slate-500 italic py-4">Chưa có chương nào.</p>;
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {chapters.map((ch) => (
        <Link
          key={ch.id}
          href={`/comics/${comicId}/chapter/${ch.id}`}
          className="flex items-center justify-between py-3 px-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
        >
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Chương {ch.chapter_number} {ch.title ? `- ${ch.title}` : ''}
          </span>
          <span className="text-xs text-slate-400">{formatDate(ch.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}

export default ChapterList;
