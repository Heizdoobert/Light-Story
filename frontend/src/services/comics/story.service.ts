import { Story } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';
import { supabase } from '@/infrastructure/supabase/client';

type StoryStatus = Story['status'];

export type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  category?: 'all' | string;
  status?: 'all' | StoryStatus;
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

export type StoryPageResult = {
  items: Story[];
  total: number;
};

type StoryListResponse = Story[] | { items: Story[] };

export async function fetchStories(): Promise<Story[]> {
  try {
    const result = await apiClient.get<StoryListResponse>('/api/stories');
    if (result) {
      const list = Array.isArray(result) ? result : result.items;
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    console.warn('[story.service] fetchStories via apiClient failed, trying Supabase fallback', err);
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('stories')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (data) return data as Story[];
    } catch {}
  }
  return [];
}

export async function fetchStoryById(id: string): Promise<Story | null> {
  try {
    const result = await apiClient.get<Story>(`/api/stories/${id}`);
    if (result) return result;
  } catch (err) {
    console.warn(`[story.service] fetchStoryById ${id} via apiClient failed, trying Supabase fallback`, err);
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) return data as Story;
    } catch {}
  }
  return null;
}

export async function incrementViews(storyId: string): Promise<void> {
  try {
    await apiClient.post('/api/stories/views', { storyId });
  } catch (err) {
    if (supabase) {
      try {
        await supabase.rpc('increment_story_views', { story_id: storyId });
      } catch {}
    }
  }
}

export async function fetchStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(Math.max(1, params.page ?? 1)));
    searchParams.set('pageSize', String(Math.min(50, Math.max(1, params.pageSize ?? 10))));
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.sort) searchParams.set('sort', params.sort);

    const result = await apiClient.get<any>(`/api/stories?${searchParams.toString()}`);
    if (result) {
      const items = Array.isArray(result) ? result : (result.items ?? []);
      const total = result.total ?? items.length;
      return { items, total };
    }
  } catch (err) {
    console.warn('[story.service] fetchStoriesPage via apiClient failed, trying Supabase fallback', err);
  }

  if (supabase) {
    try {
      let query = supabase.from('stories').select('*', { count: 'exact' }).neq('status', 'archived');
      if (params.keyword) {
        query = query.or(`title.ilike.%${params.keyword}%,author.ilike.%${params.keyword}%`);
      }
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      const sortField = params.sort === 'most_viewed' ? 'views' : params.sort === 'oldest' ? 'created_at' : 'created_at';
      const ascending = params.sort === 'oldest';
      query = query.order(sortField, { ascending });

      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count } = await query;
      return { items: (data as Story[]) || [], total: count ?? 0 };
    } catch {}
  }

  return { items: [], total: 0 };
}

export default {
  fetchStories,
  fetchStoryById,
  incrementViews,
  fetchStoriesPage,
};
