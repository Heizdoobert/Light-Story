import { supabase } from '../../lib/supabaseClient';
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
}
