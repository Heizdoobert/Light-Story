import { Story } from '@/types/entities';
import { IStoryRepository } from '@/types/repos';

type StoryStatus = Story['status'];

type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: 'all' | StoryStatus;
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

type StoryPageResult = {
  items: Story[];
  total: number;
};

export class SupabaseStoryRepository implements IStoryRepository {
  async getStories(): Promise<Story[]> {
    const res = await fetch('/api/stories');
    if (!res.ok) return [];
    const json = await res.json();
    return json.items ?? json.data ?? [];
  }

  async getStoryById(id: string): Promise<Story | null> {
    const res = await fetch(`/api/stories?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  }

  async incrementViews(storyId: string): Promise<void> {
    await fetch('/api/rpc/increment-story-views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId }) });
  }

  async saveStory(story: Partial<Story>): Promise<Story> {
    const res = await fetch('/api/internal/admin/manage-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    if (!json.story) throw new Error('Story was created but the server did not return the record');
    return json.story as Story;
  }

  async getStoriesPage(params: StoryPageParams): Promise<StoryPageResult> {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 1));
    q.set('pageSize', String(params.pageSize ?? 10));
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.status) q.set('status', params.status);
    if (params.sort) q.set('sort', params.sort);
    const res = await fetch(`/api/stories?${q.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const json = await res.json();
    return { items: json.items ?? [], total: json.total ?? 0 };
  }

  async updateStory(id: string, payload: Pick<Story, 'title' | 'description' | 'status'>): Promise<Story> {
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id, payload }) });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.story as Story;
  }

  async deleteStory(id: string): Promise<void> {
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    if (!res.ok) throw new Error('Request failed');
  }

  async bulkUpdateStatus(ids: string[], status: StoryStatus): Promise<void> {
    if (ids.length === 0) return;
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulkUpdateStatus', ids, status }) });
    if (!res.ok) throw new Error('Request failed');
  }

  async bulkDeleteStories(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await fetch(`/api/internal/admin/manage-story`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulkDelete', ids }) });
    if (!res.ok) throw new Error('Request failed');
  }
}

export default SupabaseStoryRepository;
