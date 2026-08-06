import { Author, Category, Translator } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';

export async function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/api/admin/taxonomy?entity=category');
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const rows = await apiClient.get<Category[]>('/api/admin/taxonomy?entity=category');
  return rows.find((row) => row.id === id) ?? null;
}

export async function fetchAuthors(): Promise<Author[]> {
  return apiClient.get<Author[]>('/api/admin/taxonomy?entity=author');
}

export async function fetchTranslators(): Promise<Translator[]> {
  return apiClient.get<Translator[]>('/api/admin/translators');
}
