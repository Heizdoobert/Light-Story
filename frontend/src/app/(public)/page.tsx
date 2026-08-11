import type { Metadata } from 'next';
import { HomePage } from '@/components/comics/HomePage';
import { getServerSupabase } from '@/lib/supabase/server';
import type { ComicContext as Comic } from '@/services/comics/comic.service';
import type { Chapter } from '@/types/entities';

export const metadata: Metadata = {
  title: 'Light-Story | Đọc Truyện Tranh Online Miễn Phí',
  description: 'Website đọc truyện tranh online miễn phí với hàng ngàn đầu truyện mới nhất, chất lượng cao, cập nhật liên tục.',
};

export const revalidate = 300;

const STORY_FIELDS = 'id,title,author,description,cover_url,category,status,views,created_at,updated_at';

function mapStory(row: Record<string, unknown>): Comic {
  return {
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

function latestChapterByStory(rows: Array<Record<string, unknown>>): Record<string, Chapter> {
  const map: Record<string, Chapter> = {};
  for (const row of rows) {
    const storyId = String(row.story_id ?? '');
    const number = Number(row.chapter_number ?? 0);
    if (!storyId) continue;
    const prev = map[storyId];
    if (!prev || number > Number(prev.chapter_number ?? 0)) {
      map[storyId] = {
        id: String(row.id ?? ''),
        story_id: storyId,
        chapter_number: number,
        title: String(row.title ?? ''),
        created_at: row.created_at ? String(row.created_at) : undefined,
      } as Chapter;
    }
  }
  return map;
}

export default async function Page() {
  const supabase = await getServerSupabase();
  let newest: Comic[] = [];
  let trending: Comic[] = [];
  let latestChapters: Record<string, Chapter> = {};

  if (supabase) {
    const [newestRes, trendingRes] = await Promise.all([
      supabase
        .from('stories')
        .select(STORY_FIELDS)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('stories')
        .select(STORY_FIELDS)
        .neq('status', 'archived')
        .order('views', { ascending: false })
        .limit(6),
    ]);
    newest = (newestRes.data ?? []).map(mapStory);
    trending = (trendingRes.data ?? []).map(mapStory);

    if (newest.length > 0) {
      const ids = newest.map((c) => c.id);
      const { data: chapterRows } = await supabase
        .from('chapters')
        .select('id,story_id,chapter_number,title,created_at')
        .in('story_id', ids)
        .order('chapter_number', { ascending: false });
      latestChapters = latestChapterByStory(chapterRows ?? []);
    }
  }

  return (
    <HomePage
      initialComics={newest}
      initialTrending={trending}
      initialLatestChapters={latestChapters}
      hydrated
    />
  );
}
