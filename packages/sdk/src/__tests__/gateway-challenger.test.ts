import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';
import { ChapterItem, RatingItem } from '../gateway';
import { GatewayError, SdkNetworkError } from '../errors';

describe('Adversarial Stress Testing — Gateway Domain Clients', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. SearchClient Stress Tests
  // =========================================================================
  describe('1. SearchClient Stress Testing', () => {
    it('1.1 handles empty string, whitespace keyword, and empty array filters', async () => {
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

      const resEmpty = await client.search.searchStories({
        keyword: '',
        category: [],
        tags: [],
        status: '',
        sort: '',
      });

      expect(resEmpty.items).toEqual([]);
      expect(resEmpty.total).toBe(0);
      expect(resEmpty.totalPages).toBe(1);
      expect(resEmpty.hasMore).toBe(false);

      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get('keyword')).toBe('');
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('pageSize')).toBe('10');
    });

    it('1.2 correctly URL-encodes special characters in search parameters and invalid sorts', async () => {
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
      const specialKeyword = "Solo & Hunter's <script>alert(1)</script> / ? # %20 + =";
      const specialSort = "'; DROP TABLE stories; --";

      await client.search.searchStories({
        keyword: specialKeyword,
        category: ['Action & Adventure', 'Sci-Fi / Fantasy'],
        tags: ['c++', '100%'],
        sort: specialSort,
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const parsedUrl = new URL(calledUrl);

      expect(parsedUrl.searchParams.get('keyword')).toBe(specialKeyword);
      expect(parsedUrl.searchParams.get('sort')).toBe(specialSort);
      expect(parsedUrl.searchParams.get('category')).toBe('Action & Adventure,Sci-Fi / Fantasy');
      expect(parsedUrl.searchParams.get('tag')).toBe('c++,100%');
    });

    it('1.3 clamps boundary page & pageSize limits (negative, zero, large values)', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { items: [], total: 25 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      // Negative page and pageSize
      const resNegative = await client.search.searchStories({
        page: -5,
        pageSize: -10,
      });

      expect(resNegative.page).toBe(1);
      expect(resNegative.pageSize).toBe(1);
      expect(resNegative.totalPages).toBe(25);
      expect(resNegative.hasMore).toBe(true);

      // Page 0
      const resZero = await client.search.searchStories({
        page: 0,
        pageSize: 0,
      });
      expect(resZero.page).toBe(1);
      expect(resZero.pageSize).toBe(1);

      // Maximum safe page limits
      const resHuge = await client.search.searchStories({
        page: 1000,
        pageSize: 50,
      });
      expect(resHuge.page).toBe(1000);
      expect(resHuge.pageSize).toBe(50);
      expect(resHuge.totalPages).toBe(1);
      expect(resHuge.hasMore).toBe(false);
    });

    it('1.4 propagates network failures and HTTP errors properly', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Database connection failed' },
          }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({
        baseUrl,
        fetch: mockFetch,
        retry: { maxRetries: 0 },
      });

      await expect(client.search.searchStories({ keyword: 'test' })).rejects.toThrow(GatewayError);
    });

    it('1.5 searchAll fails if either domain query fails', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/stories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: true, data: { items: [], total: 0 } }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        if (url.includes('/api/comics')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: false, error: { message: 'Comics service down' } }),
              { status: 503, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const client = new GatewayClient({
        baseUrl,
        fetch: mockFetch,
        retry: { maxRetries: 0 },
      });

      await expect(client.search.searchAll('test')).rejects.toThrow();
    });

    it('1.6 suggest handles whitespace-only keyword and resilience fallback on 500 error', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/search/suggest')) {
          return Promise.resolve(
            new Response('Suggest Error', { status: 500, statusText: 'Internal Error' }),
          );
        }
        if (url.includes('/api/stories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  items: [
                    { id: '1', title: 'Solo Hunter' },
                    { id: '2', title: '' },
                    { id: '3', title: 'Solo Hunter' },
                  ],
                  total: 3,
                },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error('Unknown'));
      });

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      // Whitespace only
      const emptyRes = await client.search.suggest('     \t\n  ');
      expect(emptyRes.suggestions).toEqual([]);

      // Resilient fallback with duplicates and empty titles
      const res = await client.search.suggest('Solo', 5);
      expect(res.suggestions).toEqual(['Solo Hunter']);
    });
  });

  // =========================================================================
  // 2. ChaptersClient resolveNavigation Stress Tests
  // =========================================================================
  describe('2. ChaptersClient resolveNavigation Stress Testing', () => {
    it('2.1 handles 0 chapters (empty array)', () => {
      const client = new GatewayClient({ baseUrl });
      const nav = client.chapters.resolveNavigation([], 'ch-1');

      expect(nav.current).toBeNull();
      expect(nav.previous).toBeNull();
      expect(nav.next).toBeNull();
      expect(nav.all).toEqual([]);
      expect(nav.currentIndex).toBe(-1);
      expect(nav.totalChapters).toBe(0);
      expect(nav.hasPrevious).toBe(false);
      expect(nav.hasNext).toBe(false);
    });

    it('2.2 handles 1 chapter with matching and non-matching currentChapterId', () => {
      const client = new GatewayClient({ baseUrl });
      const singleChapter: ChapterItem[] = [{ id: 'ch-solo', chapterNumber: 1, title: 'Only One' }];

      // Matching ID
      const navMatch = client.chapters.resolveNavigation(singleChapter, 'ch-solo');
      expect(navMatch.current?.id).toBe('ch-solo');
      expect(navMatch.previous).toBeNull();
      expect(navMatch.next).toBeNull();
      expect(navMatch.currentIndex).toBe(0);
      expect(navMatch.totalChapters).toBe(1);
      expect(navMatch.hasPrevious).toBe(false);
      expect(navMatch.hasNext).toBe(false);

      // Non-matching ID
      const navNoMatch = client.chapters.resolveNavigation(singleChapter, 'ch-unknown');
      expect(navNoMatch.current).toBeNull();
      expect(navNoMatch.previous).toBeNull();
      expect(navNoMatch.next).toBeNull();
      expect(navNoMatch.currentIndex).toBe(-1);
      expect(navNoMatch.totalChapters).toBe(1);
      expect(navNoMatch.hasPrevious).toBe(false);
      expect(navNoMatch.hasNext).toBe(false);
    });

    it('2.3 correctly resolves boundary conditions on first and last chapter', () => {
      const client = new GatewayClient({ baseUrl });
      const chapters: ChapterItem[] = [
        { id: 'ch-1', chapterNumber: 1 },
        { id: 'ch-2', chapterNumber: 2 },
        { id: 'ch-3', chapterNumber: 3 },
      ];

      // First chapter
      const first = client.chapters.resolveNavigation(chapters, 'ch-1');
      expect(first.current?.id).toBe('ch-1');
      expect(first.previous).toBeNull();
      expect(first.hasPrevious).toBe(false);
      expect(first.next?.id).toBe('ch-2');
      expect(first.hasNext).toBe(true);

      // Last chapter
      const last = client.chapters.resolveNavigation(chapters, 'ch-3');
      expect(last.current?.id).toBe('ch-3');
      expect(last.previous?.id).toBe('ch-2');
      expect(last.hasPrevious).toBe(true);
      expect(last.next).toBeNull();
      expect(last.hasNext).toBe(false);
    });

    it('2.4 handles missing/non-existent chapter ID', () => {
      const client = new GatewayClient({ baseUrl });
      const chapters: ChapterItem[] = [
        { id: 'ch-1', chapterNumber: 1 },
        { id: 'ch-2', chapterNumber: 2 },
      ];

      const nav = client.chapters.resolveNavigation(chapters, 'ch-99999');
      expect(nav.current).toBeNull();
      expect(nav.previous).toBeNull();
      expect(nav.next).toBeNull();
      expect(nav.currentIndex).toBe(-1);
      expect(nav.hasPrevious).toBe(false);
      expect(nav.hasNext).toBe(false);
    });

    it('2.5 handles negative chapter numbers (prologues / specials) and chapter 0', () => {
      const client = new GatewayClient({ baseUrl });
      const chapters: ChapterItem[] = [
        { id: 'ch-pos1', chapterNumber: 1, title: 'Chapter 1' },
        { id: 'ch-neg2', chapterNumber: -2, title: 'Prequel Special' },
        { id: 'ch-zero', chapterNumber: 0, title: 'Prologue' },
        { id: 'ch-neg1', chapterNumber: -1, title: 'Teaser' },
      ];

      // Sorted order: -2 -> -1 -> 0 -> 1
      const navNeg1 = client.chapters.resolveNavigation(chapters, 'ch-neg1');
      expect(navNeg1.currentIndex).toBe(1);
      expect(navNeg1.current?.id).toBe('ch-neg1');
      expect(navNeg1.previous?.id).toBe('ch-neg2');
      expect(navNeg1.next?.id).toBe('ch-zero');

      const navZero = client.chapters.resolveNavigation(chapters, 'ch-zero');
      expect(navZero.currentIndex).toBe(2);
      expect(navZero.previous?.id).toBe('ch-neg1');
      expect(navZero.next?.id).toBe('ch-pos1');
    });

    it('2.6 correctly sorts highly unsorted chapters, fractional numbers, and fallback chapter_number', () => {
      const client = new GatewayClient({ baseUrl });
      const unsorted: ChapterItem[] = [
        { id: 'c10', chapterNumber: 10 },
        { id: 'c0_5', chapter_number: 0.5 },
        { id: 'c1', chapterNumber: 1 },
        { id: 'c2_5', chapterNumber: 2.5 },
        { id: 'c2', chapter_number: 2 },
        { id: 'c20', chapterNumber: 20 },
      ];

      const nav = client.chapters.resolveNavigation(unsorted, 'c2');
      expect(nav.all.map((c) => c.id)).toEqual(['c0_5', 'c1', 'c2', 'c2_5', 'c10', 'c20']);
      expect(nav.previous?.id).toBe('c1');
      expect(nav.next?.id).toBe('c2_5');
    });

    it('2.7 breaks ties using created_at date when chapter numbers are equal', () => {
      const client = new GatewayClient({ baseUrl });
      const tiedChapters: ChapterItem[] = [
        { id: 'v2', chapterNumber: 1, created_at: '2026-05-02T10:00:00Z' },
        { id: 'v1', chapterNumber: 1, created_at: '2026-05-01T10:00:00Z' },
        { id: 'v3', chapterNumber: 1, created_at: '2026-05-03T10:00:00Z' },
      ];

      const nav = client.chapters.resolveNavigation(tiedChapters, 'v1');
      expect(nav.all.map((c) => c.id)).toEqual(['v1', 'v2', 'v3']);
      expect(nav.next?.id).toBe('v2');
    });
  });

  // =========================================================================
  // 3. ChaptersClient parseChapterPages Stress Tests
  // =========================================================================
  describe('3. ChaptersClient parseChapterPages Stress Testing', () => {
    it('3.1 handles malformed JSON strings gracefully', () => {
      const client = new GatewayClient({ baseUrl });

      // Incomplete JSON array
      const malformed1 = client.chapters.parseChapterPages('[ "https://cdn/p1.jpg", ');
      expect(malformed1.imageUrls).toEqual(['[ "https://cdn/p1.jpg"']);
      expect(malformed1.isCbz).toBe(false);

      // Incomplete JSON object
      const malformed2 = client.chapters.parseChapterPages('{"pages": [');
      expect(malformed2.imageUrls).toEqual(['{"pages": [']);
      expect(malformed2.isCbz).toBe(false);

      // Single non-JSON plain URL
      const plainUrl = client.chapters.parseChapterPages('https://cdn/p1.jpg');
      expect(plainUrl.imageUrls).toEqual(['https://cdn/p1.jpg']);
      expect(plainUrl.isCbz).toBe(false);
    });

    it('3.2 parses strings with leading, trailing, and inter-comma spaces', () => {
      const client = new GatewayClient({ baseUrl });

      const spacedInput = '  https://cdn/p1.jpg ,   https://cdn/p2.jpg  ,  https://cdn/p3.jpg  ';
      const res = client.chapters.parseChapterPages(spacedInput);

      expect(res.imageUrls).toEqual([
        'https://cdn/p1.jpg',
        'https://cdn/p2.jpg',
        'https://cdn/p3.jpg',
      ]);
    });

    it('3.3 handles null, undefined, empty strings, and empty objects without throwing', () => {
      const client = new GatewayClient({ baseUrl });

      expect(client.chapters.parseChapterPages(null)).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages(undefined)).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages('')).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages('    ')).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages(12345)).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages([])).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });
    });

    it('3.4 detects CBZ, ZIP, and CBR archives across various formats (case-insensitive, queries)', () => {
      const client = new GatewayClient({ baseUrl });

      // Bare CBZ URL
      const r1 = client.chapters.parseChapterPages('https://cdn.light-story.com/archives/vol1.cbz');
      expect(r1.isCbz).toBe(true);
      expect(r1.cbzUrl).toBe('https://cdn.light-story.com/archives/vol1.cbz');

      // Uppercase extension with query params
      const r2 = client.chapters.parseChapterPages('https://cdn/vol2.CBZ?expires=123456&signature=abc');
      expect(r2.isCbz).toBe(true);
      expect(r2.cbzUrl).toBe('https://cdn/vol2.CBZ?expires=123456&signature=abc');

      // ZIP format
      const r3 = client.chapters.parseChapterPages('https://cdn/vol3.zip');
      expect(r3.isCbz).toBe(true);
      expect(r3.cbzUrl).toBe('https://cdn/vol3.zip');

      // CBR format
      const r4 = client.chapters.parseChapterPages('https://cdn/vol4.cbr?token=xyz');
      expect(r4.isCbz).toBe(true);
      expect(r4.cbzUrl).toBe('https://cdn/vol4.cbr?token=xyz');

      // CBZ inside JSON array
      const r5 = client.chapters.parseChapterPages(JSON.stringify(['https://cdn/archive.cbz']));
      expect(r5.isCbz).toBe(true);
      expect(r5.cbzUrl).toBe('https://cdn/archive.cbz');

      // CBZ inside JSON object with images key
      const r6 = client.chapters.parseChapterPages(
        JSON.stringify({ images: ['https://cdn/p1.jpg', 'https://cdn/full.zip'] }),
      );
      expect(r6.isCbz).toBe(true);
      expect(r6.cbzUrl).toBe('https://cdn/full.zip');

      // URL containing 'cbz' in domain or path but not as file extension
      const r7 = client.chapters.parseChapterPages('https://cbz-cdn.com/images/page1.webp');
      expect(r7.isCbz).toBe(false);
      expect(r7.cbzUrl).toBeNull();
    });

    it('3.5 trims whitespace and filters blank elements in JSON arrays and detects CBZ', () => {
      const client = new GatewayClient({ baseUrl });

      const res = client.chapters.parseChapterPages(
        JSON.stringify([' https://cdn/p1.jpg ', '   ', 'https://cdn/p2.jpg ']),
      );

      expect(res.imageUrls).toEqual(['https://cdn/p1.jpg', 'https://cdn/p2.jpg']);
      expect(res.imageUrls).toHaveLength(2);

      // Verify CBZ archive detection with whitespace inside JSON array
      const cbzRes = client.chapters.parseChapterPages(
        JSON.stringify(['  https://cdn/archive.cbz  ']),
      );
      expect(cbzRes.isCbz).toBe(true);
      expect(cbzRes.cbzUrl).toBe('https://cdn/archive.cbz');
      expect(cbzRes.imageUrls).toEqual(['https://cdn/archive.cbz']);
    });
  });

  // =========================================================================
  // 4. CommentsClient Ratings Summary & Comment Reply Hierarchies
  // =========================================================================
  describe('4. CommentsClient Stress Testing', () => {
    it('4.1 handles 0 ratings for summary calculation', () => {
      const client = new GatewayClient({ baseUrl });
      const summary = client.comments.calculateRatingSummary('story-zero', []);

      expect(summary.storyId).toBe('story-zero');
      expect(summary.totalRatings).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    it('4.2 clamps and rounds valid rating scores in summary calculation', () => {
      const client = new GatewayClient({ baseUrl });
      const ratings: RatingItem[] = [
        { id: '1', rating: 1 },
        { id: '2', rating: 2.4 }, // rounds to 2
        { id: '3', rating: 2.6 }, // rounds to 3
        { id: '4', rating: 5 },
      ];

      const summary = client.comments.calculateRatingSummary('s-round', ratings);
      expect(summary.totalRatings).toBe(4);
      // Sum: 1 + 2.4 + 2.6 + 5 = 11. 11 / 4 = 2.75
      expect(summary.averageRating).toBe(2.75);
      expect(summary.distribution[1]).toBe(1);
      expect(summary.distribution[2]).toBe(1);
      expect(summary.distribution[3]).toBe(1);
      expect(summary.distribution[4]).toBe(0);
      expect(summary.distribution[5]).toBe(1);
    });

    it('4.3 clamps extreme scores in both sum and distribution', () => {
      const client = new GatewayClient({ baseUrl });

      // Extreme score > 5 clamps to 5
      const summaryHigh = client.comments.calculateRatingSummary('s-high', [{ id: '1', rating: 100 }]);
      expect(summaryHigh.distribution[5]).toBe(1);
      expect(summaryHigh.averageRating).toBe(5);

      // Extreme negative score < 1 clamps to 1
      const summaryLow = client.comments.calculateRatingSummary('s-low', [{ id: '1', rating: -10 }]);
      expect(summaryLow.distribution[1]).toBe(1);
      expect(summaryLow.averageRating).toBe(1);
    });

    it('4.4 filters non-numeric rating entries so totalRatings and average are not diluted', () => {
      const client = new GatewayClient({ baseUrl });
      const ratings: RatingItem[] = [
        { id: '1', rating: 5 },
        { id: '2', rating: 'invalid-score' as any },
      ];

      const summary = client.comments.calculateRatingSummary('s-invalid', ratings);
      expect(summary.storyId).toBe('s-invalid');
      expect(summary.distribution[5]).toBe(1);
      // 'invalid-score' is filtered out; totalRatings counts valid ratings only
      expect(summary.totalRatings).toBe(1);
      expect(summary.averageRating).toBe(5);
    });

    it('4.5 correctly serializes storyId and commentId with special characters and invalid IDs', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { items: [], total: 0 } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      // Story ID with special characters like slashes, colons, spaces
      const specialStoryId = 'story/uuid:123 special?param=val';
      await client.comments.listComments({ storyId: specialStoryId });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/stories/${encodeURIComponent(specialStoryId)}/comments`),
        expect.anything(),
      );

      // Comment ID with special characters
      const specialCommentId = 'comm/id#123';
      await client.comments.deleteComment(specialCommentId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.light-story.test/api/comments/${encodeURIComponent(specialCommentId)}`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('4.6 supports threaded comment hierarchies with parentId filtering and nesting', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const parsedUrl = new URL(url);

        // Submitting reply to comment
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  id: 'reply-1',
                  storyId: 'story-1',
                  body: body.body,
                  parentId: body.parentId,
                },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }

        // Listing replies with parentId
        if (parsedUrl.searchParams.get('parentId') === 'parent-comm-1') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  items: [
                    {
                      id: 'reply-1',
                      storyId: 'story-1',
                      body: 'Reply to parent',
                      parentId: 'parent-comm-1',
                    },
                  ],
                  total: 1,
                },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }

        // Top level comments (no parentId)
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                items: [
                  {
                    id: 'parent-comm-1',
                    storyId: 'story-1',
                    body: 'Top level root comment',
                    parentId: null,
                    replies: [],
                  },
                ],
                total: 1,
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      });

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      // 1. Fetch top level comments
      const rootComments = await client.comments.listComments({ storyId: 'story-1' });
      expect(rootComments.items).toHaveLength(1);
      expect(rootComments.items[0].parentId).toBeNull();

      // 2. Post reply with parentId
      const reply = await client.comments.createComment({
        storyId: 'story-1',
        body: 'Reply to parent',
        parentId: 'parent-comm-1',
      });
      expect(reply.parentId).toBe('parent-comm-1');

      // 3. Fetch replies with parentId filter
      const replies = await client.comments.listComments({
        storyId: 'story-1',
        parentId: 'parent-comm-1',
      });
      expect(replies.items).toHaveLength(1);
      expect(replies.items[0].parentId).toBe('parent-comm-1');
    });
  });
});
