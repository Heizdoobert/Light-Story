import { Story } from '@/types/entities';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';

type StoryStatus = Story['status'];

export type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  category?: 'all' | string;
  tag?: 'all' | string;
  status?: 'all' | StoryStatus;
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

export type StoryPageResult = {
  items: Story[];
  total: number;
};

type StoryListResponse = Story[] | { items: Story[] };

export async function fetchStories(): Promise<Story[]> {
  try {
    const result = await apiClient.get<StoryListResponse>(ROUTES.API.STORIES);
    if (result) {
      const list = Array.isArray(result) ? result : result.items;
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    console.warn('[story.service] fetchStories via apiClient failed', err);
  }
  return [];
}

export async function fetchStoryById(id: string): Promise<Story | null> {
  try {
    const result = await apiClient.get<Story>(ROUTES.API.STORY(id));
    if (result) return result;
  } catch (err) {
    console.warn(`[story.service] fetchStoryById ${id} via apiClient failed`, err);
  }
  return null;
}

export async function fetchStoriesByIds(ids: string[]): Promise<Story[]> {
  if (!ids.length) return [];
  try {
    const results = await Promise.all(ids.map((id) => apiClient.get<Story>(ROUTES.API.STORY(id))));
    return results.filter((s): s is Story => s != null);
  } catch (err) {
    console.warn('[story.service] fetchStoriesByIds failed', err);
  }
  return [];
}

export async function incrementViews(storyId: string): Promise<void> {
  try {
    await apiClient.post(ROUTES.API.STORIES_VIEWS, { storyId });
  } catch (err) {
    console.warn('[story.service] incrementViews failed', err);
  }
}

export async function fetchStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(Math.max(1, params.page ?? 1)));
    searchParams.set('pageSize', String(Math.min(50, Math.max(1, params.pageSize ?? 10))));
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params.tag && params.tag !== 'all') searchParams.set('tag', params.tag);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.sort) searchParams.set('sort', params.sort);

    const result = await apiClient.get<any>(ROUTES.API.STORIES_PAGE(searchParams.toString()));
    if (result) {
      const items = Array.isArray(result) ? result : (result.items ?? []);
      const total = result.total ?? items.length;
      return { items, total };
    }
  } catch (err) {
    console.warn('[story.service] fetchStoriesPage via apiClient failed', err);
  }
  return { items: [], total: 0 };
}
