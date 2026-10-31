import { getGatewayUrl } from '@/lib/utils/gateway-url';
import {
  HttpClient,
  ClientConfig,
  AdminClient,
  AnalyticsClient,
  ChaptersClient,
  ComicsClient,
  CommentsClient,
  HealthClient,
  R2Client,
  SearchClient,
  StoriesClient,
  UserClient,
} from '@light-story/sdk';
import { ErrorsClient } from '../errors/errorsClient';

export class GatewayHttpClient extends HttpClient {
  private _admin?: AdminClient;
  private _analytics?: AnalyticsClient;
  private _chapters?: ChaptersClient;
  private _comics?: ComicsClient;
  private _comments?: CommentsClient;
  private _errors?: ErrorsClient;
  private _health?: HealthClient;
  private _r2?: R2Client;
  private _search?: SearchClient;
  private _stories?: StoriesClient;
  private _user?: UserClient;

  constructor(config: ClientConfig = {}) {
    super(config);
  }

  public get admin(): AdminClient {
    if (!this._admin) this._admin = new AdminClient(this);
    return this._admin;
  }

  public get analytics(): AnalyticsClient {
    if (!this._analytics) this._analytics = new AnalyticsClient(this);
    return this._analytics;
  }

  public get chapters(): ChaptersClient {
    if (!this._chapters) this._chapters = new ChaptersClient(this);
    return this._chapters;
  }

  public get comics(): ComicsClient {
    if (!this._comics) this._comics = new ComicsClient(this);
    return this._comics;
  }

  public get comments(): CommentsClient {
    if (!this._comments) this._comments = new CommentsClient(this);
    return this._comments;
  }

  public get errors(): ErrorsClient {
    if (!this._errors) this._errors = new ErrorsClient(this);
    return this._errors;
  }

  public get health(): HealthClient {
    if (!this._health) this._health = new HealthClient(this);
    return this._health;
  }

  public get r2(): R2Client {
    if (!this._r2) this._r2 = new R2Client(this);
    return this._r2;
  }

  public get search(): SearchClient {
    if (!this._search) this._search = new SearchClient(this);
    return this._search;
  }

  public get stories(): StoriesClient {
    if (!this._stories) this._stories = new StoriesClient(this);
    return this._stories;
  }

  public get user(): UserClient {
    if (!this._user) this._user = new UserClient(this);
    return this._user;
  }

  public override getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl.replace(/\/+$/, '');
    }
    return getGatewayUrl().replace(/\/+$/, '');
  }

  protected override async resolveToken(explicitToken?: string | null): Promise<string | null> {
    const resolved = await super.resolveToken(explicitToken);
    if (resolved) {
      return resolved;
    }

    // Attempt browser-side Supabase session lookup if in client environment
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('../../supabaseClient');
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
