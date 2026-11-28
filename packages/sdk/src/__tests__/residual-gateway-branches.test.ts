import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../client';
import { ChaptersClient, CommentsClient } from '../gateway';
import type { ChapterItem } from '../gateway/clients/chapters';
import type { RatingItem } from '../gateway/clients/comments';

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

function setup() {
  const fetchMock = vi.fn().mockResolvedValue(ok([]));
  const http = new HttpClient({
    baseUrl: 'https://api.light-story.test',
    fetch: fetchMock,
    retry: false,
  });
  return { chapters: new ChaptersClient(http), comments: new CommentsClient(http), fetchMock };
}

const respond = (fetchMock: ReturnType<typeof vi.fn>, data: unknown) =>
  fetchMock.mockResolvedValue(ok(data));

beforeEach(() => vi.restoreAllMocks());

describe('ChaptersClient residual branches', () => {
  it('listByStory handles array, items envelope and null', async () => {
    const { chapters, fetchMock } = setup();
    respond(fetchMock, [{ id: 'a' }]);
    expect(await chapters.listByStory('s')).toHaveLength(1);
    respond(fetchMock, { items: [{ id: 'b' }] });
    expect((await chapters.listByStory('s'))[0].id).toBe('b');
    respond(fetchMock, null);
    expect(await chapters.listByStory('s')).toEqual([]);
  });

  it('getBatchLatest handles empty, array, object values and null', async () => {
    const { chapters, fetchMock } = setup();
    expect(await chapters.getBatchLatest([])).toEqual([]);
    respond(fetchMock, [{ id: 'a' }]);
    expect(await chapters.getBatchLatest(['c1'])).toHaveLength(1);
    respond(fetchMock, { first: { id: '1' }, bad: null, arr: [1], ignore: 'x' });
    expect(await chapters.getBatchLatest(['c1'])).toEqual([{ id: '1' }]);
    respond(fetchMock, null);
    expect(await chapters.getBatchLatest(['c1'])).toEqual([]);
  });

  it('resolveNavigation sorts snake_case numbers and tolerates missing fields', () => {
    const { chapters } = setup();
    const list = [
      { id: '1', chapterNumber: 2 },
      { id: '2', chapter_number: 2 },
      { id: '3', chapterNumber: 1 },
      { id: '4' },
    ] as ChapterItem[];
    const nav = chapters.resolveNavigation(list, '1');
    expect(nav.previous?.id).toBe('3');
    expect(nav.next?.id).toBe('2');
    expect(chapters.resolveNavigation(null as unknown as ChapterItem[], 'x').all).toEqual([]);
  });

  it('parseChapterPages handles string and array payload variants', () => {
    const { chapters } = setup();
    expect(chapters.parseChapterPages('["a.cbz", 5]')).toEqual({
      imageUrls: ['a.cbz', '5'],
      isCbz: true,
      cbzUrl: 'a.cbz',
    });
    expect(chapters.parseChapterPages('{"images":["a.png",7]}').imageUrls).toEqual(['a.png', '7']);
    expect(chapters.parseChapterPages('{"imageUrls":["b.png"]}').imageUrls).toEqual(['b.png']);
    expect(chapters.parseChapterPages('{"pages":{"no":"array"}}').imageUrls).toEqual([
      '{"pages":{"no":"array"}}',
    ]);
    expect(chapters.parseChapterPages('plain.jpg').imageUrls).toEqual(['plain.jpg']);
    expect(chapters.parseChapterPages([' x.cbr ', 9, ''])).toEqual({
      imageUrls: ['x.cbr', '9'],
      isCbz: true,
      cbzUrl: 'x.cbr',
    });
  });
});

describe('CommentsClient residual branches', () => {
  it('listComments handles array and total envelope', async () => {
    const { comments, fetchMock } = setup();
    respond(fetchMock, [{ id: 'c1' }]);
    expect(await comments.listComments({ storyId: 's' })).toEqual({
      items: [{ id: 'c1' }],
      total: 1,
    });
    respond(fetchMock, { items: [{ id: 'c2' }], total: 9 });
    expect(await comments.listComments({ storyId: 's' }).then((r) => r.total)).toBe(9);
  });

  it('createComment defaults parentId to null', async () => {
    const { comments, fetchMock } = setup();
    respond(fetchMock, { id: 'c' });
    await comments.createComment({ storyId: 's', body: 'x' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).parentId).toBeNull();
  });

  it('listRatings passes pagination and handles payload variants', async () => {
    const { comments, fetchMock } = setup();
    respond(fetchMock, [{ id: 'r', rating: 5 }]);
    expect((await comments.listRatings('s')).total).toBe(1);
    respond(fetchMock, { items: [{ id: 'r', rating: 4 }], total: 7 });
    const result = await comments.listRatings('s', { page: 2, pageSize: 3 });
    expect(result.total).toBe(7);
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get('page')).toBe('2');
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get('pageSize')).toBe('3');
  });

  it('calculateRatingSummary skips malformed ratings', () => {
    const { comments } = setup();
    const ratings = [
      null,
      5,
      { id: 'a', rating: '  ' },
      { id: 'b', rating: 'abc' },
      { id: 'c', rating: 6 },
      { id: 'd', rating: '4' },
    ] as unknown as RatingItem[];
    const summary = comments.calculateRatingSummary('s', ratings);
    expect(summary.totalRatings).toBe(2);
    expect(summary.distribution[4]).toBe(1);
    expect(summary.distribution[5]).toBe(1);
    expect(comments.calculateRatingSummary('s', null as unknown as RatingItem[]).totalRatings).toBe(0);
  });
});
