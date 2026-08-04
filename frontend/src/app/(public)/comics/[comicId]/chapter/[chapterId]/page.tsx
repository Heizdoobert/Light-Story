"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChapterReader } from '@/components/comic/chapter-reader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ChapterReaderPage({ params }: { params: { comicId: string; chapterId: string } }) {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChapterImages() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from('chapter_images')
          .select('image_url')
          .eq('chapter_id', params.chapterId)
          .order('page_number', { ascending: true });

        if (data && data.length > 0) {
          setImages(data.map((item) => item.image_url));
        } else {
          setImages([
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
            'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800',
          ]);
        }
      } catch (err) {
        console.error('Failed to load chapter images:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChapterImages();
  }, [params.chapterId]);

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-20 z-40">
        <Link href={`/comics/${params.comicId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft size={16} /> Chi Tiết Truyện
          </Button>
        </Link>
        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Đang Đọc Chapter</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="sm"><ChevronRight size={16} /></Button>
        </div>
      </div>

      {/* Chapter Reader Container */}
      {isLoading ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      ) : (
        <ChapterReader images={images} />
      )}
    </div>
  );
}
