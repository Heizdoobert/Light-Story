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
    await supabase.rpc('increment_story_views', { story_id_param: storyId });
  }

  async saveStory(story: Partial<Story>): Promise<Story> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await supabase
      .from('stories')
      .insert([story])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
