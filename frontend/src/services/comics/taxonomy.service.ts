import { Category, Translator } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';

export async function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/api/admin/taxonomy?entity=category');
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const rows = await apiClient.get<Category[]>('/api/admin/taxonomy?entity=category');
  return rows.find((row) => row.id === id) ?? null;
}

export async function createCategory(payload: { name: string; description?: string | null }) {
  return apiClient.post('/api/admin/taxonomy', { entity: 'category', action: 'create', payload });
}

export async function updateCategory(id: string, payload: { name: string; description?: string | null }) {
  return apiClient.post('/api/admin/taxonomy', { entity: 'category', action: 'update', id, payload });
}

export async function deleteCategory(id: string) {
  return apiClient.post('/api/admin/taxonomy', { entity: 'category', action: 'delete', id });
}

export async function fetchAuthors(): Promise<any[]> {
  return apiClient.get<any[]>('/api/admin/taxonomy?entity=author');
}

export async function createAuthor(payload: { name: string; bio?: string | null }): Promise<any> {
  return apiClient.post('/api/admin/taxonomy', { entity: 'author', action: 'create', payload });
}

export async function updateAuthor(id: string, payload: { name: string; bio?: string | null }): Promise<any> {
  return apiClient.post('/api/admin/taxonomy', { entity: 'author', action: 'update', id, payload });
}

export async function deleteAuthor(id: string): Promise<void> {
  return apiClient.post('/api/admin/taxonomy', { entity: 'author', action: 'delete', id });
}

export async function fetchTranslators(): Promise<Translator[]> {
  return apiClient.get<Translator[]>('/api/admin/translators');
}

export async function createTranslator(payload: { name: string; contact?: string; notes?: string; status?: string }): Promise<Translator> {
  return apiClient.post('/api/admin/translators', payload);
}

export async function updateTranslator(id: string, payload: { name?: string; contact?: string; notes?: string; status?: string }): Promise<Translator> {
  return apiClient.patch(`/api/admin/translators/${id}`, payload);
}

export async function deleteTranslator(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/translators/${id}`);
}
