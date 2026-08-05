"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { ChapterReader } from '@/components/comic/chapter-reader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ChapterReaderPage({
  params,
}: {
  params: Promise<{ comicId: string; chapterId: string }>;
}) {
  const { comicId, chapterId } = use(params);
  const [images, setImages] = useState<string[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadChapterImages() {
      try {
        const supabase = getSupabaseBrowserClient();

        // Query chapter title
        const { data: chapterInfo } = await supabase
          .from('chapters')
          .select('title, chapter_number, images')
          .eq('id', chapterId)
          .maybeSingle();

        if (chapterInfo) {
          setChapterTitle(
            chapterInfo.title
              ? `Chương ${chapterInfo.chapter_number}: ${chapterInfo.title}`
              : `Chương ${chapterInfo.chapter_number}`
          );
        }

        // Query pages from chapter_images table
        const { data: chImages } = await supabase
          .from('chapter_images')
          .select('image_url')
          .eq('chapter_id', chapterId)
          .order('page_number', { ascending: true });

        if (chImages && chImages.length > 0) {
          setImages(chImages.map((item) => item.image_url));
        } else if (chapterInfo?.images && Array.isArray(chapterInfo.images) && chapterInfo.images.length > 0) {
          setImages(chapterInfo.images);
        } else {
          setImages([]);
        }
      } catch (err) {
        console.error('Failed to load chapter images:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChapterImages();
  }, [chapterId]);

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-20 z-40">
        <Link href={`/comics/${comicId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-700 dark:text-slate-200">
            <ArrowLeft size={16} /> Chi Tiết Truyện
          </Button>
        </Link>

        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
          <BookOpen size={16} className="text-orange-500" />
          <span className="truncate max-w-xs">{chapterTitle || 'Đang Đọc Chapter'}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" title="Chương trước"><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="sm" title="Chương kế"><ChevronRight size={16} /></Button>
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
