import { Story, Chapter, SiteSetting } from '../domain/entities';

export interface IStoryRepository {
  getStories(): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
  incrementViews(storyId: string): Promise<void>;
}

export interface IChapterRepository {
  getChapterById(id: string): Promise<Chapter | null>;
  getChaptersByStoryId(storyId: string): Promise<Chapter[]>;
}

export interface ISettingsRepository {
  getSettingByKey(key: string): Promise<SiteSetting | null>;
  updateSetting(key: string, value: string): Promise<void>;
}
