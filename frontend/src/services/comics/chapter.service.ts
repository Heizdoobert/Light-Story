import { Chapter } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';

export async function fetchChaptersByStoryId(storyId: string): Promise<Chapter[]> {
  try {
    return await apiClient.get<Chapter[]>(ROUTES.API.CHAPTERS_BY_STORY(storyId));
  } catch {
    return [];
  }
}
