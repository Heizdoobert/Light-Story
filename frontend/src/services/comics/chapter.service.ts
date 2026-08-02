import { Chapter } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';

export async function fetchChapterById(id: string): Promise<Chapter | null> {
  try {
    return await apiClient.get<Chapter | null>(`/api/chapters?id=${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchChaptersByStoryId(storyId: string): Promise<Chapter[]> {
  try {
    return await apiClient.get<Chapter[]>(`/api/chapters?storyId=${encodeURIComponent(storyId)}`);
  } catch {
    return [];
  }
}
