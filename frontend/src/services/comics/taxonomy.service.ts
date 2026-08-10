import { Author, Translator } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';

export async function fetchAuthors(): Promise<Author[]> {
  return apiClient.get<Author[]>(ROUTES.API.ADMIN.TAXONOMY('author'));
}

export async function fetchTranslators(): Promise<Translator[]> {
  return apiClient.get<Translator[]>(ROUTES.API.ADMIN.TRANSLATORS);
}
