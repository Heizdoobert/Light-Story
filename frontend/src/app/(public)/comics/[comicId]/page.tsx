import type { Metadata } from 'next';
import { ComicDetailPageContent } from '@/components/comics/ComicDetailPageContent';
import { getServerSupabase } from '@/lib/supabase/server';
import { getR2ImageUrl } from '@/lib/utils/image-url';
import type { ComicContext as Comic } from '@/services/comics/comic.service';
import type { Chapter, Category } from '@/types/entities';

type Props = { params: Promise<{ comicId: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comicId } = await params;
  const supabase = await getServerSupabase();

  if (!supabase) {
    return { title: 'Chi tiết truyện | Light Story' };
  }

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

export default async function ComicDetailPage({ params }: Props) {
  const { comicId } = await params;
  const supabase = await getServerSupabase();

  let comic: Comic | null = null;
  let chapters: Chapter[] = [];
  let categories: Category[] = [];

  if (supabase) {
    const [storyRes, chaptersRes, categoriesRes] = await Promise.all([
      supabase
        .from('stories')
        .select('id,title,slug,author,description,cover_url,category,status,views,created_at,updated_at')
        .eq('id', comicId)
        .maybeSingle(),
      supabase
        .from('chapters')
        .select('id,story_id,chapter_number,title,created_at')
        .eq('story_id', comicId)
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
    ]);

    if (storyRes.data) {
      const row = storyRes.data as Record<string, unknown>;
      comic = {
        id: String(row.id),
        tenantKey: '',
        storyId: String(row.id),
        title: String(row.title ?? ''),
        slug: String(row.slug ?? ''),
        description: String(row.description ?? ''),
        author: String(row.author ?? ''),
        status: row.status === 'completed' ? 'completed' : 'ongoing',
        category: Array.isArray(row.category) ? (row.category as string[]) : String(row.category ?? '').split(',').map((c) => c.trim()).filter(Boolean),
        viewCount: Number(row.views ?? 0),
        coverUrl: String(row.cover_url ?? ''),
        createdAt: row.created_at ? String(row.created_at) : undefined,
        updatedAt: row.updated_at ? String(row.updated_at) : undefined,
      };
    }

    chapters = (chaptersRes.data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      story_id: String(row.story_id ?? ''),
      chapter_number: Number(row.chapter_number ?? 0),
      title: String(row.title ?? ''),
      created_at: row.created_at ? String(row.created_at) : undefined,
    })) as Chapter[];

    categories = categoriesRes.data as Category[];
  }

  return (
    <ComicDetailPageContent
      initialComic={comic}
      initialChapters={chapters}
      initialCategories={categories}
      hydrated
    />
  );
}
