import { Story } from '@/types/entities';

export interface IAdminView {
  showLoading(): void;
  hideLoading(): void;
  displayStats(stats: { totalViews: number, activeStories: number, totalChapters: number }): void;
  displayStories(stories: Story[]): void;
  showSuccess(message: string): void;
  showError(message: string): void;
}
