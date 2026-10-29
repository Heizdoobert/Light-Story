import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';
import { ChapterItem } from '../gateway';

describe('ChaptersClient', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('API endpoints', () => {
    it('lists chapters by story ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: 'ch-1', chapter_number: 1, title: 'Chapter 1' },
              { id: 'ch-2', chapter_number: 2, title: 'Chapter 2' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const chapters = await client.chapters.listByStory('story-123');

      expect(chapters).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/chapters?storyId=story-123',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('gets chapter by chapter ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'ch-99', title: 'Special Chapter', content: '["page1.jpg"]' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const ch = await client.chapters.getById('ch-99');

      expect(ch.id).toBe('ch-99');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/chapters/ch-99',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('batch fetches latest chapters for multiple comics', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: 'ch-10', comic_id: 'c1', chapter_number: 10 },
              { id: 'ch-20', comic_id: 'c2', chapter_number: 20 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.chapters.getBatchLatest(['c1', 'c2']);

      expect(res).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/comics/chapters/batch?comicIds=c1%2Cc2',
        expect.anything(),
      );

      // Empty input returns [] without network call
      const emptyRes = await client.chapters.getBatchLatest([]);
      expect(emptyRes).toEqual([]);
    });

    it('creates, updates, and deletes chapter', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: { id: 'new-ch', title: 'Ch 1', chapterNumber: 1 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: { id: 'new-ch', title: 'Ch 1 Updated' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ success: true, data: { success: true } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });

      const created = await client.chapters.create('comic-1', {
        chapterNumber: 1,
        title: 'Ch 1',
        content: 'pages.json',
      });
      expect(created.id).toBe('new-ch');

      const updated = await client.chapters.update('new-ch', { title: 'Ch 1 Updated' });
      expect(updated.title).toBe('Ch 1 Updated');

      const deleted = await client.chapters.delete('new-ch');
      expect(deleted.success).toBe(true);
    });
  });

  describe('resolveNavigation', () => {
    const chapters: ChapterItem[] = [
      { id: 'c3', chapterNumber: 3, title: 'Chapter 3' },
      { id: 'c1', chapterNumber: 1, title: 'Chapter 1' },
      { id: 'c2', chapterNumber: 2, title: 'Chapter 2' },
      { id: 'c2_5', chapterNumber: 2.5, title: 'Chapter 2.5 Extra' },
    ];

    it('sorts chapters ascending and resolves middle chapter neighbors', () => {
      const client = new GatewayClient({ baseUrl });
      const nav = client.chapters.resolveNavigation(chapters, 'c2');

      expect(nav.current?.id).toBe('c2');
      expect(nav.previous?.id).toBe('c1');
      expect(nav.next?.id).toBe('c2_5');
      expect(nav.hasPrevious).toBe(true);
      expect(nav.hasNext).toBe(true);
      expect(nav.currentIndex).toBe(1);
      expect(nav.totalChapters).toBe(4);
    });

    it('correctly handles boundary navigation (first and last chapter)', () => {
      const client = new GatewayClient({ baseUrl });

      // First chapter
      const firstNav = client.chapters.resolveNavigation(chapters, 'c1');
      expect(firstNav.previous).toBeNull();
      expect(firstNav.hasPrevious).toBe(false);
      expect(firstNav.next?.id).toBe('c2');
      expect(firstNav.hasNext).toBe(true);

      // Last chapter
      const lastNav = client.chapters.resolveNavigation(chapters, 'c3');
      expect(lastNav.previous?.id).toBe('c2_5');
      expect(lastNav.hasPrevious).toBe(true);
      expect(lastNav.next).toBeNull();
      expect(lastNav.hasNext).toBe(false);
    });

    it('handles non-existent chapter gracefully', () => {
      const client = new GatewayClient({ baseUrl });
      const nav = client.chapters.resolveNavigation(chapters, 'unknown-id');

      expect(nav.current).toBeNull();
      expect(nav.previous).toBeNull();
      expect(nav.next).toBeNull();
      expect(nav.hasPrevious).toBe(false);
      expect(nav.hasNext).toBe(false);
      expect(nav.currentIndex).toBe(-1);
    });
  });

  describe('parseChapterPages', () => {
    it('parses JSON array string of image URLs', () => {
      const client = new GatewayClient({ baseUrl });
      const parsed = client.chapters.parseChapterPages('["https://cdn/p1.webp", "https://cdn/p2.webp"]');

      expect(parsed.imageUrls).toEqual(['https://cdn/p1.webp', 'https://cdn/p2.webp']);
      expect(parsed.isCbz).toBe(false);
      expect(parsed.cbzUrl).toBeNull();
    });

    it('parses comma-separated string of URLs', () => {
      const client = new GatewayClient({ baseUrl });
      const parsed = client.chapters.parseChapterPages('https://cdn/p1.webp, https://cdn/p2.webp');

      expect(parsed.imageUrls).toEqual(['https://cdn/p1.webp', 'https://cdn/p2.webp']);
      expect(parsed.isCbz).toBe(false);
    });

    it('detects CBZ and ZIP archives', () => {
      const client = new GatewayClient({ baseUrl });
      const parsed = client.chapters.parseChapterPages('https://cdn/chapter1.cbz?token=abc');

      expect(parsed.isCbz).toBe(true);
      expect(parsed.cbzUrl).toBe('https://cdn/chapter1.cbz?token=abc');
    });

    it('handles corrupted, null, or empty content without throwing', () => {
      const client = new GatewayClient({ baseUrl });

      expect(client.chapters.parseChapterPages(null)).toEqual({
        imageUrls: [],
        isCbz: false,
        cbzUrl: null,
      });

      expect(client.chapters.parseChapterPages('{ invalid json ]')).toEqual({
        imageUrls: ['{ invalid json ]'],
        isCbz: false,
        cbzUrl: null,
      });
    });
  });
});
