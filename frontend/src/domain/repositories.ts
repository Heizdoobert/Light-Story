import { Story, Chapter, SiteSetting } from '../domain/entities';

export interface IStoryRepository {
  getStories(): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
  incrementViews(storyId: string): Promise<void>;
  saveStory(story: Partial<Story>): Promise<Story>;
}

export interface IChapterRepository {
  getChapterById(id: string): Promise<Chapter | null>;
  getChaptersByStoryId(storyId: string): Promise<Chapter[]>;
  saveChapter(chapter: Partial<Chapter>): Promise<Chapter>;
}

export interface ISettingsRepository {
  getSettingByKey(key: string): Promise<SiteSetting | null>;
  updateSetting(key: string, value: string): Promise<void>;
}
