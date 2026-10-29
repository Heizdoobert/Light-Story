import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';

describe('SearchClient', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchStories', () => {
    it('searches stories with keyword, multiple categories, tags, and pagination', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [
                { id: 'story-1', title: 'Solo Leveling', author: 'Chugong', status: 'ongoing' },
                { id: 'story-2', title: 'Omniscient Reader', author: 'Sing Shong', status: 'ongoing' },
              ],
              total: 25,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const result = await client.search.searchStories({
        keyword: 'hunter',
        category: ['Action', 'Fantasy'],
        tags: ['dungeon', 'system'],
        status: 'ongoing',
        sort: 'popular',
        page: 2,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stories?'),
        expect.objectContaining({ method: 'GET' }),
      );
      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get('keyword')).toBe('hunter');
      expect(url.searchParams.get('category')).toBe('Action,Fantasy');
      expect(url.searchParams.get('tag')).toBe('dungeon,system');
      expect(url.searchParams.get('status')).toBe('ongoing');
      expect(url.searchParams.get('sort')).toBe('popular');
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('pageSize')).toBe('10');
    });

    it('handles response returned as direct array without total field', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'story-1', title: 'Test Story' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const result = await client.search.searchStories({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('searchComics', () => {
    it('searches comics and formats page result', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [{ id: 'comic-1', title: 'Tower of God' }],
              total: 5,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const result = await client.search.searchComics({ keyword: 'tower', page: 1, pageSize: 5 });

      expect(result.items[0].title).toBe('Tower of God');
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('forwards tag and tags filters in searchComics', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { items: [], total: 0 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      await client.search.searchComics({ tags: ['action', 'manhwa'] });

      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get('tag')).toBe('action,manhwa');
    });
  });

  describe('searchAll', () => {
    it('concurrently queries both stories and comics', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/stories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: { items: [{ id: 's1', title: 'Story Match' }], total: 1 },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        if (url.includes('/api/comics')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: { items: [{ id: 'c1', title: 'Comic Match' }], total: 1 },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const result = await client.search.searchAll('Match');

      expect(result.stories.items[0].title).toBe('Story Match');
      expect(result.comics.items[0].title).toBe('Comic Match');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('suggest', () => {
    it('returns empty array for empty keyword without network call', async () => {
      const mockFetch = vi.fn();
      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      const res = await client.search.suggest('   ');
      expect(res.suggestions).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses dedicated /api/search/suggest endpoint if available', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { suggestions: ['Solo Leveling', 'Solo Bug Player'] },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.search.suggest('Solo', 5);

      expect(res.suggestions).toEqual(['Solo Leveling', 'Solo Bug Player']);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/suggest?keyword=Solo&limit=5'),
        expect.anything(),
      );
    });

    it('accepts unwrapped array directly from /api/search/suggest', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: ['Title A', 'Title B'],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.search.suggest('Title');
      expect(res.suggestions).toEqual(['Title A', 'Title B']);
    });

    it('falls back to extracting unique story titles if suggest endpoint fails', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/search/suggest')) {
          return Promise.resolve(
            new Response('Not Found', { status: 404, statusText: 'Not Found' }),
          );
        }
        if (url.includes('/api/stories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  items: [
                    { id: '1', title: 'Solo Leveling' },
                    { id: '2', title: 'Solo Leveling' }, // Duplicate
                    { id: '3', title: 'Solo Farming in the Tower' },
                  ],
                  total: 3,
                },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.search.suggest('Solo', 2);

      expect(res.suggestions).toEqual(['Solo Leveling', 'Solo Farming in the Tower']);
    });
  });
});
