"use client";

import React from 'react';
import Link from 'next/link';
import { Sparkles, Eye } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { getStatusStyles } from '@/lib/statusStyles';

type RecommendedComicsProps = {
  comicId: string;
};

export const RecommendedComics: React.FC<RecommendedComicsProps> = ({ comicId }) => {
  const { data: recommendations = [], isLoading } = useRecommendations(comicId);

  if (isLoading || recommendations.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Truyện đề xuất cho bạn</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {recommendations.map((comic) => (
          <Link
            key={comic.id}
            href={`/comics/${comic.id}`}
            className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-800/80"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={comic.coverUrl || 'https://placehold.co/300x400?text=No+Cover'}
                alt={comic.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${getStatusStyles(comic.status)}`}>
                {comic.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
              </span>
            </div>

            <div className="p-2.5 flex flex-col flex-grow">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                {comic.title}
              </h4>
              <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {comic.viewCount || 0}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
