"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, User, Calendar } from 'lucide-react';
import { ChapterList, type ChapterItem } from '@/components/comic/chapter-list';
import { RatingStars } from '@/components/comic/rating-stars';
import { GenreBadge } from '@/components/comic/genre-badge';
import { BookmarkButton } from '@/components/user/bookmark-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getR2ImageUrl } from '@/lib/utils/image-url';

export default function ComicDetailPage({ params }: { params: { comicId: string } }) {
  const [comic, setComic] = useState<any>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadComicDetail() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: story } = await supabase
          .from('stories')
          .select('*')
          .eq('id', params.comicId)
          .maybeSingle();

        if (story) {
          setComic(story);
        } else {
          setComic({
            id: params.comicId,
            title: 'Chi Tiết Truyện',
            author: 'Tác Giả',
            description: 'Mô tả chi tiết truyện tranh...',
            status: 'ongoing',
            rating: 4.8,
          });
        }

        const { data: chData } = await supabase
          .from('chapters')
          .select('id, chapter_number, title, created_at')
          .eq('story_id', params.comicId)
          .order('chapter_number', { ascending: false });

        if (chData && chData.length > 0) {
          setChapters(chData);
        } else {
          setChapters([
            { id: 'ch1', chapter_number: 1, title: 'Khởi đầu mới', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Failed to load comic details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadComicDetail();
  }, [params.comicId]);

  if (isLoading) {
    return (
      <div className="py-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Info Card */}
      <Card className="p-6 sm:p-8 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 aspect-[3/4] relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <img
            src={getR2ImageUrl(comic?.cover_url)}
            alt={comic?.title}
            width={400}
            height={600}
            loading="eager"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{comic?.title}</h1>
            <BookmarkButton comicId={params.comicId} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <User size={14} /> {comic?.author || 'Đang cập nhật'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} /> Status: {comic?.status || 'ongoing'}
            </span>
            <RatingStars rating={comic?.rating || 4.5} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <GenreBadge name="Action" slug="action" />
            <GenreBadge name="Fantasy" slug="fantasy" />
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-2">
            {comic?.description || 'Chưa có mô tả cho bộ truyện này.'}
          </p>

          {chapters.length > 0 && (
            <div className="pt-2">
              <Link
                href={`/comics/${params.comicId}/chapter/${chapters[chapters.length - 1].id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-colors"
              >
                <BookOpen size={16} /> Đọc Từ Đầu
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Chapters Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Danh Sách Chương ({chapters.length})</h2>
        <Card className="p-4">
          <ChapterList comicId={params.comicId} chapters={chapters} />
        </Card>
      </section>
    </div>
  );
}
