"use client";

import { useEffect, useState } from 'react';
import { ComicList } from '@/components/comic/comic-list';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ComicCardProps } from '@/components/comic/comic-card';

export default function GenreDetailPage({ params }: { params: { genreSlug: string } }) {
  const [comics, setComics] = useState<ComicCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGenreComics() {
      setIsLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('stories')
          .select('id, title, cover_url, updated_at')
          .limit(20);

        if (data && data.length > 0) {
          setComics(
            data.map((item) => ({
              id: item.id,
              title: item.title,
              coverImage: item.cover_url || undefined,
            }))
          );
        } else {
          setComics([]);
        }
      } catch (err) {
        console.error('Failed to load genre comics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGenreComics();
  }, [params.genreSlug]);

  return (
    <div className="space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 capitalize">
          Thể Loại: {params.genreSlug}
        </h1>
        <p className="text-sm text-slate-500">Danh sách các bộ truyện thuộc thể loại {params.genreSlug}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <ComicList comics={comics} />
      )}
    </div>
  );
}
