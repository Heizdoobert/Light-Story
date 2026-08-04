import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { getR2ImageUrl } from '@/lib/utils/image-url';

type Props = { params: Promise<{ comicId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comicId } = await params;
  const supabase = await getServerSupabase();
  const { data: comic } = await supabase
    .from('stories')
    .select('title, description, cover_url, author')
    .eq('id', comicId)
    .maybeSingle();

  if (!comic) {
    return { title: 'Không tìm thấy truyện | Light Story' };
  }

  const title = `${comic.title} - Đọc Truyện Tranh Online | Light Story`;
  const description = (comic.description || `Đọc truyện ${comic.title} online`).slice(0, 155);

  return {
    title,
    description,
    openGraph: {
      title: comic.title,
      description,
      images: comic.cover_url ? [{ url: getR2ImageUrl(comic.cover_url) }] : undefined,
      type: 'book',
      authors: comic.author ? [comic.author] : undefined,
    },
  };
}

export default function ComicDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
