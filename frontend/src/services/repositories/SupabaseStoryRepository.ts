import { supabase } from '@/lib/supabase/client';
import { Story } from '@/types/entities';
import { IStoryRepository } from '@/types/repos';

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
    const { data, error } = await supabase.from('stories').select('*');
    if (error) throw error;
    return data || [];
  }

  async getStoryById(id: string): Promise<Story | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('stories').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async incrementViews(storyId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.functions.invoke('increment-story-views', {
      body: { storyId },
    });
    if (error) throw error;
  }

  async saveStory(story: Partial<Story>): Promise<Story> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.functions.invoke('manage-story', {
      body: {
        title: story.title,
        author: story.author,
        authorId: story.author_id,
        description: story.description,
        cover_url: story.cover_url,
        category: story.category,
        categoryId: story.category_id,
        status: story.status,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    if (!data?.story) {
      throw new Error('Story was created but the server did not return the record');
    }

    return data.story as Story;
  }

  async getStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
    if (!supabase) return { items: [], total: 0 };

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('stories')
      .select('*', { count: 'exact' });

    const keyword = params.keyword?.trim();
    if (keyword) {
      const escaped = keyword.replace(/[%_]/g, (match) => `\\${match}`);
      query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (params.sort === 'most_viewed') {
      query = query.order('views', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;
    return {
      items: data || [],
      total: count ?? 0,
    };
  }

  async updateStory(id: string, payload: Pick<Story, 'title' | 'description' | 'status'>): Promise<Story> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('stories')
      .update({
        title: payload.title,
        description: payload.description,
        status: payload.status,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Story;
  }

  async deleteStory(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async bulkUpdateStatus(ids: string[], status: StoryStatus): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('stories')
      .update({ status })
      .in('id', ids);

    if (error) throw error;
  }

  async bulkDeleteStories(ids: string[]): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('stories')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }
}

export default SupabaseStoryRepository;
