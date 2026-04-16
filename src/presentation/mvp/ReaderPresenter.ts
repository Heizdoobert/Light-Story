import { IReaderView } from './ReaderContract';
import { IStoryRepository, IChapterRepository } from '../../domain/repositories';

export class ReaderPresenter {
  private view: IReaderView | null = null;

  constructor(
    private storyRepo: IStoryRepository,
    private chapterRepo: IChapterRepository
  ) {}

  attachView(view: IReaderView) {
    this.view = view;
  }

  detachView() {
    this.view = null;
  }

  async loadChapterData(storyId: string, chapterId: string) {
    if (!this.view) return;

    try {
      this.view.showLoading();
      
      const [chapter, story] = await Promise.all([
        this.chapterRepo.getChapterById(chapterId),
        this.storyRepo.getStoryById(storyId)
      ]);

      if (chapter) {
        this.view.displayChapter(chapter);
        await this.storyRepo.incrementViews(storyId);
      }

      if (story) {
        this.view.displayStoryMetadata(story.title, story.description);
      }

    } catch (error: any) {
      this.view.showError(error.message || 'Lỗi tải dữ liệu');
    } finally {
      this.view.hideLoading();
    }
  }
}
