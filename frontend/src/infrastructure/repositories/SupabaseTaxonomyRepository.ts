/**
 * Infrastructure Layer - Supabase Taxonomy Repository
 * Handles category and author data persistence
 */

import { Category } from '@/types/entities';
import { supabase } from '@/lib/supabase/client';

export class SupabaseTaxonomyRepository {
  async getCategories(): Promise<Category[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('id,name,description,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) return [];
    return (data ?? []) as Category[];
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('categories')
      .select('id,name,description,created_at,updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return null;
    return (data ?? null) as Category | null;
  }

  async createCategory(payload: { name: string; description?: string | null }) {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'category', action: 'create', payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    return json.data;
  }

  async updateCategory(id: string, payload: { name: string; description?: string | null }) {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'category', action: 'update', id, payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    return json.data;
  }

  async deleteCategory(id: string) {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'category', action: 'delete', id }) });
    if (!res.ok) throw new Error('Request failed');
  }

  // Authors management (used by admin UI)
  async getAuthors(): Promise<any[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('authors')
      .select('id,name,bio,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) return [];
    return (data ?? []) as any[];
  }

  async createAuthor(payload: { name: string; bio?: string | null }): Promise<any> {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'author', action: 'create', payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    return json.data;
  }

  async updateAuthor(id: string, payload: { name: string; bio?: string | null }): Promise<any> {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'author', action: 'update', id, payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    return json.data;
  }

  async deleteAuthor(id: string): Promise<void> {
    const res = await fetch('/api/internal/admin/taxonomy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'author', action: 'delete', id }) });
    if (!res.ok) throw new Error('Request failed');
  }
}
