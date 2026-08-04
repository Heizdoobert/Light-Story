"use client";

import Link from 'next/link';
import { getR2ImageUrl } from '@/lib/utils/image-url';

export interface ComicCardProps {
  id: string;
  title: string;
  coverImage?: string;
  latestChapter?: number;
}

export function ComicCard({ id, title, coverImage, latestChapter }: ComicCardProps) {
  return (
    <Link href={`/comics/${id}`} className="group flex flex-col space-y-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
        <img
          src={getR2ImageUrl(coverImage)}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {latestChapter && (
          <span className="absolute bottom-2 left-2 bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white rounded-full">
            Chap {latestChapter}
          </span>
        )}
      </div>
      <h3 className="line-clamp-2 text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-500 transition-colors">
        {title}
      </h3>
    </Link>
  );
}

export default ComicCard;
