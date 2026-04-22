import { supabase } from '../../core/supabase';
import { Author, Category } from '../../domain/entities';

export class SupabaseTaxonomyRepository {
  async getAuthors(): Promise<Author[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Author[];
  }

  async createAuthor(payload: { name: string; bio?: string }): Promise<Author> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('authors')
      .insert({
        name: payload.name.trim(),
        bio: payload.bio?.trim() || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Author;
  }

  async updateAuthor(id: string, payload: { name: string; bio?: string }): Promise<Author> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('authors')
      .update({
        name: payload.name.trim(),
        bio: payload.bio?.trim() || null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Author;
  }

  async deleteAuthor(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('authors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getCategories(): Promise<Category[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Category[];
  }

  async createCategory(payload: { name: string; description?: string }): Promise<Category> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Category;
  }

  async updateCategory(id: string, payload: { name: string; description?: string }): Promise<Category> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
