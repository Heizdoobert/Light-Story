import { Story } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';

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

export async function fetchStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(Math.max(1, params.page ?? 1)));
  searchParams.set('pageSize', String(Math.min(50, Math.max(1, params.pageSize ?? 10))));
  if (params.keyword) searchParams.set('keyword', params.keyword);
  if (params.category && params.category !== 'all') searchParams.set('category', params.category);
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.sort) searchParams.set('sort', params.sort);

  const result = await apiClient.get<any>(`/api/stories?${searchParams.toString()}`);
  const items = Array.isArray(result) ? result : (result.items ?? []);
  const total = result.total ?? items.length;
  return { items, total };
}

export default {
  fetchStories,
  fetchStoryById,
  fetchStoriesPage,
};
