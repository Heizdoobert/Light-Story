import { HttpClient } from '../client';
import { AdminClient } from './admin';
import { AnalyticsClient } from './analytics';
import { ComicsClient } from './comics';
import { StoriesClient } from './stories';
import { R2Client } from './r2';
import { UserClient } from './user';
import { HealthClient } from './health';
import { StorageManager } from '../storage/storage-manager';

export * from './admin';
export * from './analytics';
export * from './comics';
export * from './stories';
export * from './r2';
export * from './user';
export * from './health';

export class GatewayApi {
  public readonly admin: AdminClient;
  public readonly analytics: AnalyticsClient;
  public readonly comics: ComicsClient;
  public readonly stories: StoriesClient;
  public readonly r2: R2Client;
  public readonly storage: StorageManager;
  public readonly user: UserClient;
  public readonly health: HealthClient;

  constructor(public readonly http: HttpClient) {
    this.admin = new AdminClient(http);
    this.analytics = new AnalyticsClient(http);
    this.comics = new ComicsClient(http);
    this.stories = new StoriesClient(http);
    this.r2 = new R2Client(http);
    this.storage = new StorageManager(http);
    this.user = new UserClient(http);
    this.health = new HealthClient(http);
  }
}
