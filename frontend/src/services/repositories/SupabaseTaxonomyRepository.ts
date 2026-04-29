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

  async createCategory(payload: { name: string; description?: string | null }) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('categories').insert([{ name: payload.name, description: payload.description }]).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, payload: { name: string; description?: string | null }) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('categories').update({ name: payload.name, description: payload.description }).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  // Authors management (used by admin UI)
  async getAuthors(): Promise<any[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('authors').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createAuthor(payload: { name: string; bio?: string | null }): Promise<any> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('authors').insert([{ name: payload.name, bio: payload.bio }]).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateAuthor(id: string, payload: { name: string; bio?: string | null }): Promise<any> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('authors').update({ name: payload.name, bio: payload.bio }).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }

  async deleteAuthor(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.from('authors').delete().eq('id', id);
    if (error) throw error;
  }
}

export default SupabaseTaxonomyRepository;
