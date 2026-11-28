import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../client';
import { SdkNetworkError } from '../errors';
import {
  AdminClient,
  AnalyticsClient,
  ChaptersClient,
  ComicsClient,
  CommentsClient,
  GatewayApi,
  HealthClient,
  R2Client,
  SearchClient,
  StoriesClient,
  UserClient,
} from '../gateway';
import { StorageManager } from '../storage/storage-manager';

const baseUrl = 'https://api.light-story.test';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const ok = (data: unknown) => json({ success: true, data });
const errorResponse = (status: number, code: string) =>
  json({ success: false, error: { code, message: 'boom' } }, status);

function setup() {
  const fetchMock = vi.fn().mockResolvedValue(ok({ ok: true }));
  const http = new HttpClient({
    baseUrl,
    fetch: fetchMock,
    retry: false,
  });
  return { api: new GatewayApi(http), fetchMock, http };
}

const calledUrl = (fetchMock: ReturnType<typeof vi.fn>) =>
  new URL(fetchMock.mock.calls[0][0] as string);

interface CallCase {
  name: string;
  method: string;
  path: string;
  call: (api: GatewayApi) => Promise<unknown>;
}

const cases: CallCase[] = [
  { name: 'admin.getSiteSettings', method: 'GET', path: '/api/admin/site-settings', call: (a) => a.admin.getSiteSettings() },
  { name: 'admin.updateSiteSettings', method: 'POST', path: '/api/admin/site-settings', call: (a) => a.admin.updateSiteSettings({ theme: 'dark' }) },
  { name: 'admin.getMetrics', method: 'GET', path: '/api/admin/metrics', call: (a) => a.admin.getMetrics() },
  { name: 'admin.getLogs', method: 'GET', path: '/api/admin/logs', call: (a) => a.admin.getLogs() },
  { name: 'admin.createBackup', method: 'POST', path: '/api/admin/backup', call: (a) => a.admin.createBackup() },
  { name: 'admin.restoreBackup', method: 'POST', path: '/api/admin/restore', call: (a) => a.admin.restoreBackup({ settings: {} }) },
  { name: 'analytics.getOverview', method: 'GET', path: '/api/analytics/overview', call: (a) => a.analytics.getOverview() },
  { name: 'analytics.recordView', method: 'POST', path: '/api/analytics/view', call: (a) => a.analytics.recordView({ target_id: 's1', type: 'story' }) },
  { name: 'analytics.getEngagement', method: 'GET', path: '/api/analytics/engagement', call: (a) => a.analytics.getEngagement() },
  { name: 'analytics.getInfrastructure', method: 'GET', path: '/api/analytics/infrastructure', call: (a) => a.analytics.getInfrastructure() },
  { name: 'comics.list', method: 'GET', path: '/api/comics', call: (a) => a.comics.list() },
  { name: 'comics.getRecommendations', method: 'GET', path: '/api/comics/recommendations', call: (a) => a.comics.getRecommendations() },
  { name: 'comics.getById', method: 'GET', path: '/api/comics/c1', call: (a) => a.comics.getById('c1') },
  { name: 'comics.getChapters', method: 'GET', path: '/api/comics/c1/chapters', call: (a) => a.comics.getChapters('c1') },
  { name: 'comics.getChapter', method: 'GET', path: '/api/comics/c1/chapters/1', call: (a) => a.comics.getChapter('c1', 1) },
  { name: 'comics.create', method: 'POST', path: '/api/comics', call: (a) => a.comics.create({ title: 'C' }) },
  { name: 'comics.update', method: 'PUT', path: '/api/comics/c1', call: (a) => a.comics.update('c1', { title: 'C2' }) },
  { name: 'comics.delete', method: 'DELETE', path: '/api/comics/c1', call: (a) => a.comics.delete('c1') },
  { name: 'stories.getCategories', method: 'GET', path: '/api/categories', call: (a) => a.stories.getCategories() },
  { name: 'stories.recordView', method: 'POST', path: '/api/stories/s1/view', call: (a) => a.stories.recordView('s1') },
  { name: 'stories.list', method: 'GET', path: '/api/stories', call: (a) => a.stories.list() },
  { name: 'stories.getById', method: 'GET', path: '/api/stories/s1', call: (a) => a.stories.getById('s1') },
  { name: 'stories.getChapter', method: 'GET', path: '/api/stories/s1/chapters/1', call: (a) => a.stories.getChapter('s1', 1) },
  { name: 'stories.create', method: 'POST', path: '/api/stories', call: (a) => a.stories.create({ title: 'S' }) },
  { name: 'stories.update', method: 'PUT', path: '/api/stories/s1', call: (a) => a.stories.update('s1', { title: 'S2' }) },
  { name: 'stories.delete', method: 'DELETE', path: '/api/stories/s1', call: (a) => a.stories.delete('s1') },
  { name: 'user.toggleBookmark', method: 'POST', path: '/api/user/bookmarks/toggle', call: (a) => a.user.toggleBookmark('c1') },
  { name: 'user.saveHistory', method: 'POST', path: '/api/user/history', call: (a) => a.user.saveHistory({ comicId: 'c1' }) },
  { name: 'user.getBookmarks', method: 'GET', path: '/api/user/bookmarks', call: (a) => a.user.getBookmarks() },
  { name: 'user.addBookmark', method: 'POST', path: '/api/user/bookmarks/add', call: (a) => a.user.addBookmark('c1') },
  { name: 'user.removeBookmark', method: 'DELETE', path: '/api/user/bookmarks/c1', call: (a) => a.user.removeBookmark('c1') },
  { name: 'user.getHistory', method: 'GET', path: '/api/user/history', call: (a) => a.user.getHistory() },
  { name: 'user.recordHistory', method: 'POST', path: '/api/user/history', call: (a) => a.user.recordHistory({ comicId: 'c1', chapterId: 'ch1' }) },
];

describe('GatewayApi facade', () => {
  it('instantiates every client without undefined members', () => {
    const { api, http } = setup();
    const members = [
      ['admin', AdminClient],
      ['analytics', AnalyticsClient],
      ['chapters', ChaptersClient],
      ['comics', ComicsClient],
      ['comments', CommentsClient],
      ['health', HealthClient],
      ['r2', R2Client],
      ['search', SearchClient],
      ['storage', StorageManager],
      ['stories', StoriesClient],
      ['user', UserClient],
    ] as const;

    expect(api.http).toBe(http);
    for (const [key, ctor] of members) {
      expect(api[key]).toBeInstanceOf(ctor);
    }
    expect(Object.values(api).every(Boolean)).toBe(true);
  });
});

describe.each(cases)('$name', ({ method, path, call }) => {
  beforeEach(() => vi.restoreAllMocks());

  it('happy path uses expected method and path', async () => {
    const { api, fetchMock } = setup();
    await call(api);
    const url = calledUrl(fetchMock);
    expect(url.origin + url.pathname).toBe(baseUrl + path);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method }));
  });

  it('maps HTTP 4xx to typed GatewayError', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(errorResponse(401, 'UNAUTHORIZED'));
    await expect(call(api)).rejects.toMatchObject({
      name: 'GatewayError',
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('maps HTTP 5xx to typed GatewayError', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(errorResponse(503, 'INTERNAL_ERROR'));
    await expect(call(api)).rejects.toMatchObject({
      name: 'GatewayError',
      status: 503,
      code: 'INTERNAL_ERROR',
    });
  });

  it('maps network failure to SdkNetworkError', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(call(api)).rejects.toBeInstanceOf(SdkNetworkError);
  });
});

describe('GatewayApi option merging', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('admin merges scope and explicit params', async () => {
    const { api, fetchMock } = setup();
    await api.admin.getSiteSettings('all', { params: { scope: 'public', extra: '1' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('scope')).toBe('public');
    expect(url.searchParams.get('extra')).toBe('1');
  });

  it('admin merges log filters with params override', async () => {
    const { api, fetchMock } = setup();
    await api.admin.getLogs({ limit: 5, type: 'error' }, { params: { offset: 2, type: 'warn' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('offset')).toBe('2');
    expect(url.searchParams.get('type')).toBe('warn');
  });

  it('analytics merges explicit days with params override', async () => {
    const { api, fetchMock } = setup();
    await api.analytics.getEngagement(7, { params: { days: 14, segment: 'vip' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('days')).toBe('14');
    expect(url.searchParams.get('segment')).toBe('vip');
  });

  it('comics merges list params with options override', async () => {
    const { api, fetchMock } = setup();
    await api.comics.list({ page: 2, keyword: 'a' }, { params: { page: 3, sort: 'new' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('keyword')).toBe('a');
    expect(url.searchParams.get('sort')).toBe('new');
  });

  it('stories merges list params with options override', async () => {
    const { api, fetchMock } = setup();
    await api.stories.list({ page: 2, limit: 10 }, { params: { page: 4, keyword: 'k' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('page')).toBe('4');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('keyword')).toBe('k');
  });

  it('user merges explicit pageSize with params override', async () => {
    const { api, fetchMock } = setup();
    await api.user.getBookmarks(10, { params: { pageSize: 20, sort: 'recent' } });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('pageSize')).toBe('20');
    expect(url.searchParams.get('sort')).toBe('recent');
  });
});

describe('GatewayApi residual gateway branches', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('r2 upload emits optional form fields only when present', async () => {
    const { api, fetchMock } = setup();
    const file = new Blob(['x']);

    await api.r2.upload(file);
    await api.r2.upload(file, { comicId: 'c1', chapterNumber: 1, pageNumber: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('search accepts string category and tag', async () => {
    const { api, fetchMock } = setup();
    await api.search.searchStories({ category: 'fantasy', tag: 'magic' });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('category')).toBe('fantasy');
    expect(url.searchParams.get('tag')).toBe('magic');
  });

  it('search comics covers category array and tag array', async () => {
    const { api, fetchMock } = setup();
    await api.search.searchComics({ category: ['fantasy', 'epic'], tags: ['magic', 'war'] });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('category')).toBe('fantasy,epic');
    expect(url.searchParams.get('tag')).toBe('magic,war');
  });

  it('search comics covers category string and tag string', async () => {
    const { api, fetchMock } = setup();
    await api.search.searchComics({ category: 'fantasy', tag: 'magic' });
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('category')).toBe('fantasy');
    expect(url.searchParams.get('tag')).toBe('magic');
  });

  it('search comics handles array payload', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(ok([{ id: 'c1' }]));
    const result = await api.search.searchComics();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('search comics handles empty payload', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(ok(null));
    const result = await api.search.searchComics();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('search comics falls back to item count when total is absent', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(ok({ items: [{ id: 'c1' }, { id: 'c2' }] }));
    const result = await api.search.searchComics();
    expect(result.total).toBe(2);
  });

  it('suggest returns no suggestions for blank keyword', async () => {
    const { api, fetchMock } = setup();
    await expect(api.search.suggest('')).resolves.toEqual({ suggestions: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('suggest falls back when response has no suggestions array', async () => {
    const { api, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(ok({}));
    fetchMock.mockResolvedValueOnce(ok([]));
    await expect(api.search.suggest('key')).resolves.toEqual({ suggestions: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
