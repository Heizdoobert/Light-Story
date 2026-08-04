"use client";

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ComicList } from '@/components/comic/comic-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ComicCardProps } from '@/components/comic/comic-card';

export default function ComicsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [comics, setComics] = useState<ComicCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchComics() {
      setIsLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        let query = supabase.from('stories').select('id, title, cover_url, updated_at');

        if (debouncedQuery.trim()) {
          query = query.ilike('title', `%${debouncedQuery}%`);
        }

        const { data } = await query.order('updated_at', { ascending: false }).limit(24);

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
        console.error('Error searching comics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchComics();
  }, [debouncedQuery]);

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Danh Sách Truyện</h1>
          <p className="text-sm text-slate-500 mt-1">Tìm kiếm và lọc truyện theo sở thích của bạn</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            type="text"
            placeholder="Tìm tên truyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : comics.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-slate-500 text-lg">Không tìm thấy bộ truyện nào phù hợp.</p>
          <Button variant="outline" onClick={() => setSearchQuery('')}>Xóa Tìm Kiếm</Button>
        </div>
      ) : (
        <ComicList comics={comics} />
      )}
    </div>
  );
}
