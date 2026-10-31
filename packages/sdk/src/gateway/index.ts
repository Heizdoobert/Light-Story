import { HttpClient } from '../client';
import { AdminClient } from './clients/admin';
import { AnalyticsClient } from './clients/analytics';
import { ChaptersClient } from './clients/chapters';
import { ComicsClient } from './clients/comics';
import { CommentsClient } from './clients/comments';
import { HealthClient } from './clients/health';
import { R2Client } from './clients/r2';
import { SearchClient } from './clients/search';
import { StoriesClient } from './clients/stories';
import { UserClient } from './clients/user';
import { StorageManager } from '../storage/storage-manager';

export * from './clients/admin';
export * from './clients/analytics';
export * from './clients/chapters';
export * from './clients/comics';
export * from './clients/comments';
export * from './clients/health';
export * from './clients/r2';
export * from './clients/search';
export * from './clients/stories';
export * from './clients/user';

export class GatewayApi {
  public readonly admin: AdminClient;
  public readonly analytics: AnalyticsClient;
  public readonly chapters: ChaptersClient;
  public readonly comics: ComicsClient;
  public readonly comments: CommentsClient;
  public readonly health: HealthClient;
  public readonly r2: R2Client;
  public readonly search: SearchClient;
  public readonly storage: StorageManager;
  public readonly stories: StoriesClient;
  public readonly user: UserClient;

  constructor(public readonly http: HttpClient) {
    this.admin = new AdminClient(http);
    this.analytics = new AnalyticsClient(http);
    this.chapters = new ChaptersClient(http);
    this.comics = new ComicsClient(http);
    this.comments = new CommentsClient(http);
    this.health = new HealthClient(http);
    this.r2 = new R2Client(http);
    this.search = new SearchClient(http);
    this.storage = new StorageManager(http);
    this.stories = new StoriesClient(http);
    this.user = new UserClient(http);
  }
}
