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

  async saveChapter(chapter: Partial<Chapter>): Promise<Chapter> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.functions.invoke('manage-chapter', {
      body: {
        story_id: chapter.story_id,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const created = await this.getChapterById(data.chapter.id);
    if (!created) throw new Error('Chapter was created but could not be retrieved');
    return created;
  }
}
