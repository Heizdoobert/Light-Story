import { supabase } from '../../core/supabase';
import { Chapter } from '../../domain/entities';
import { IChapterRepository } from '../../domain/repositories';

export class SupabaseChapterRepository implements IChapterRepository {
  async getChapterById(id: string): Promise<Chapter | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async getChaptersByStoryId(storyId: string): Promise<Chapter[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('chapters').select('*').eq('story_id', storyId).order('chapter_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }
}
