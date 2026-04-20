import { supabase } from '../../core/supabase';
import { Story } from '../../domain/entities';
import { IStoryRepository } from '../../domain/repositories';

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
        description: story.description,
        cover_url: story.cover_url,
        category: story.category,
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
}
