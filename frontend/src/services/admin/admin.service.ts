import { ROUTES } from '@/lib/constants/routes';
import { apiClient } from '@/lib/api/apiClient';

export async function getStoriesFieldValues(field: 'category' | 'author_id') {
  return apiClient.get<Array<Record<string, string | null>>>(ROUTES.API.ADMIN.STORIES_FIELD_VALUES(field));
}
