import { IAdminView } from './AdminContract';
import { IStoryRepository, IChapterRepository, ISettingsRepository } from '../../domain/repositories';

export class AdminPresenter {
  private view: IAdminView | null = null;

  constructor(
    private storyRepo: IStoryRepository,
    private chapterRepo: IChapterRepository,
    private settingsRepo: ISettingsRepository
  ) {}

  attachView(view: IAdminView) {
    this.view = view;
  }

  detachView() {
    this.view = null;
  }

  async loadDashboardData() {
    if (!this.view) return;
    try {
      this.view.showLoading();
      const [stories, header, middle, sidebar] = await Promise.all([
        this.storyRepo.getStories(),
        this.settingsRepo.getSettingByKey('ad_header'),
        this.settingsRepo.getSettingByKey('ad_middle'),
        this.settingsRepo.getSettingByKey('ad_sidebar')
      ]);
      
      const totalViews = stories.reduce((sum, s) => sum + (s.views || 0), 0);
      const activeStories = stories.length;
      
      this.view.displayStats({
        totalViews,
        activeStories,
        totalChapters: 0 
      });
      
      this.view.displayStories(stories);

      // Trả về dữ liệu ad để view cập nhật state
      return {
        header: header?.value || '',
        middle: middle?.value || '',
        sidebar: sidebar?.value || ''
      };
    } catch (error: any) {
      this.view.showError(error.message);
    } finally {
      this.view.hideLoading();
    }
  }

  async saveAdConfig(key: string, value: string) {
    if (!this.view) return;
    try {
      await this.settingsRepo.updateSetting(key, value);
      this.view.showSuccess(`Đã lưu cấu hình ${key}`);
    } catch (error: any) {
      this.view.showError(error.message);
    }
  }
}
