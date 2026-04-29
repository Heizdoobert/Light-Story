import { Story } from '@/types/entities';
import { IStoryRepository } from '@/types/repos';
import { supabase } from '@/lib/supabase/client';

type StoryStatus = Story['status'];

type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'all' | StoryStatus;
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

type StoryPageResult = {
  items: Story[];
  total: number;
};

export class SupabaseStoryRepository implements IStoryRepository {
  async getStories(): Promise<Story[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('stories')
      .select('id,title,author,author_id,description,cover_url,category,category_id,status,views,created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return (data ?? []) as Story[];
  }

  async getStoryById(id: string): Promise<Story | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('stories')
      .select('id,title,author,author_id,description,cover_url,category,category_id,status,views,created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return null;
    return (data ?? null) as Story | null;
  }

  async incrementViews(storyId: string): Promise<void> {
    await fetch('/api/rpc/increment-story-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId }) });
  }

  async saveStory(story: Partial<Story>): Promise<Story> {
    const res = await fetch('/api/internal/admin/manage-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (!json.story) throw new Error('Story was created but the server did not return the record');
    return json.story as Story;
  }

  async getStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
    if (!supabase) return { items: [], total: 0 };

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('stories')
      .select('id,title,author,author_id,description,cover_url,category,category_id,status,views,created_at', { count: 'exact' });

    if (params.keyword) {
      const escaped = params.keyword.replace(/[%_]/g, (match) => `\\${match}`);
      query = query.or(
        `title.ilike.%${escaped}%,author.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`,
      );
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (params.sort === 'most_viewed') query = query.order('views', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error) return { items: [], total: 0 };
    return { items: (data ?? []) as Story[], total: count ?? 0 };
  }

  async updateStory(id: string, payload: Pick<Story, 'title' | 'description' | 'status'>): Promise<Story> {
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id, payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.story as Story;
  }

  async deleteStory(id: string): Promise<void> {
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    if (!res.ok) throw new Error('Request failed');
  }

  async bulkUpdateStatus(ids: string[], status: StoryStatus): Promise<void> {
    if (ids.length === 0) return;
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulkUpdateStatus', ids, status }) });
    if (!res.ok) throw new Error('Request failed');
  }

  async bulkDeleteStories(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulkDelete', ids }) });
    if (!res.ok) throw new Error('Request failed');
  }
}

export default SupabaseStoryRepository;
