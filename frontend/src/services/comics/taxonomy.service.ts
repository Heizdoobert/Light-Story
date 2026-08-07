import { Author, Category, Translator } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';

export async function fetchCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>(ROUTES.API.ADMIN.TAXONOMY('category'));
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const rows = await apiClient.get<Category[]>(ROUTES.API.ADMIN.TAXONOMY('category'));
  return rows.find((row) => row.id === id) ?? null;
}

export async function fetchAuthors(): Promise<Author[]> {
  return apiClient.get<Author[]>(ROUTES.API.ADMIN.TAXONOMY('author'));
}

export async function fetchTranslators(): Promise<Translator[]> {
  return apiClient.get<Translator[]>(ROUTES.API.ADMIN.TRANSLATORS);
}
