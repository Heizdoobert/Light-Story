import { supabase } from '@/lib/supabase/client';
import { Category } from '@/types/entities';

export class SupabaseTaxonomyRepository {
  async getCategories(): Promise<Category[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
}

export default SupabaseTaxonomyRepository;
