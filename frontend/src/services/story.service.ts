import SupabaseStoryRepository from "./repositories/SupabaseStoryRepository";

const repo = new SupabaseStoryRepository();

export async function fetchStories(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) {
  if (!params) return repo.getStories();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return repo.getStoriesPage({ page, pageSize, keyword: params.keyword });
}

export async function fetchStoryById(id: string) {
  return repo.getStoryById(id);
}

export async function incrementViews(storyId: string) {
  return repo.incrementViews(storyId);
}

export async function saveStory(story: Partial<any>) {
  return repo.saveStory(story);
}

export default {
  fetchStories,
  fetchStoryById,
  incrementViews,
  saveStory,
};
