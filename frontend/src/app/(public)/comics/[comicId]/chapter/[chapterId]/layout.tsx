import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ comicId: string; chapterId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comicId, chapterId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: comic }, { data: chapter }] = await Promise.all([
    supabase.from('stories').select('title').eq('id', comicId).maybeSingle(),
    supabase
      .from('chapters')
      .select('chapter_number, title')
      .eq('id', chapterId)
      .maybeSingle(),
  ]);

  const comicTitle = comic?.title ?? 'Truyện tranh';
  const chapterTitle = chapter?.title ?? `Chương ${chapter?.chapter_number ?? ''}`;

  return {
    title: `${chapterTitle} - ${comicTitle} | Light Story`,
    description: `Đọc ${chapterTitle} của ${comicTitle} online.`,
    openGraph: {
      title: `${chapterTitle} - ${comicTitle}`,
      description: `Đọc ${chapterTitle} của ${comicTitle} online.`,
      type: 'book',
    },
  };
}

export default function ChapterDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
