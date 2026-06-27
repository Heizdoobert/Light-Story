import { Story } from '@/types/entities';
import { apiClient } from '@/lib/apiClient';

type StoryStatus = Story['status'];

export type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  category?: 'all' | string;
  status?: 'all' | StoryStatus;
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

export type StoryPageResult = {
  items: Story[];
  total: number;
};

type StoryListResponse = Story[] | { items: Story[] };

export async function fetchStories(): Promise<Story[]> {
  const result = await apiClient.get<StoryListResponse>('/api/stories');
  return Array.isArray(result) ? result : result.items;
}

export async function fetchStoryById(id: string): Promise<Story | null> {
  return apiClient.get<Story>(`/api/stories/${id}`);
}

export async function incrementViews(storyId: string): Promise<void> {
  await apiClient.post('/api/stories/views', { storyId });
}

export async function saveStory(story: Partial<Story>): Promise<Story> {
  const result = await apiClient.post<Story[] | { story: Story }>('/api/admin/manage-story', { story });
  const created = Array.isArray(result) ? result[0] : result.story;
  if (!created) throw new Error('Story was created but the server did not return the record');
  return created;
}

export async function fetchStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(Math.max(1, params.page ?? 1)));
  searchParams.set('pageSize', String(Math.min(50, Math.max(1, params.pageSize ?? 10))));
  if (params.keyword) searchParams.set('keyword', params.keyword);
  if (params.category && params.category !== 'all') searchParams.set('category', params.category);
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.sort) searchParams.set('sort', params.sort);

  const result = await apiClient.get<StoryListResponse>(`/api/stories?${searchParams.toString()}`);
  const items = Array.isArray(result) ? result : result.items;
  return { items, total: items.length };
}

export async function updateStory(id: string, payload: Pick<Story, 'title' | 'description' | 'status'>): Promise<Story> {
  const result = await apiClient.post<Story[] | { story: Story }>('/api/admin/manage-story', { action: 'update', id, payload });
  const updated = Array.isArray(result) ? result[0] : result.story;
  if (!updated) throw new Error('Update failed');
  return updated;
}

export async function deleteStory(id: string): Promise<void> {
  await apiClient.post('/api/admin/manage-story', { action: 'delete', id });
}

export async function bulkUpdateStatus(ids: string[], status: StoryStatus): Promise<void> {
  await apiClient.post('/api/admin/manage-story', { action: 'bulkUpdateStatus', ids, status });
}

export async function bulkDeleteStories(ids: string[]): Promise<void> {
  await apiClient.post('/api/admin/manage-story', { action: 'bulkDelete', ids });
}

export default {
  fetchStories,
  fetchStoryById,
  incrementViews,
  saveStory,
  fetchStoriesPage,
  updateStory,
  deleteStory,
  bulkUpdateStatus,
  bulkDeleteStories,
};
