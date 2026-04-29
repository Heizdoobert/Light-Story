import { Chapter } from '@/types/entities';

export interface IReaderView {
  showLoading(): void;
  hideLoading(): void;
  displayChapter(chapter: Chapter): void;
  displayStoryMetadata(storyTitle: string, description: string): void;
  showError(message: string): void;
}
