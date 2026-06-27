import { Chapter } from '@/types/entities';
import { apiClient } from '@/lib/apiClient';

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

export async function saveChapter(chapter: Partial<Chapter>): Promise<Chapter> {
  const result = await apiClient.post<Chapter[] | { chapter: Chapter }>('/api/admin/manage-chapter', { chapter });
  const created = Array.isArray(result) ? result[0] : result.chapter;
  if (!created) throw new Error('Chapter was created but server did not return the record');
  return created;
}
