import { Category } from '@/types/entities';

export class SupabaseTaxonomyRepository {
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/taxonomy/categories');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const res = await fetch(`/api/taxonomy/categories?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
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
    const res = await fetch('/api/internal/admin/taxonomy?type=authors');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
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

export default SupabaseTaxonomyRepository;
