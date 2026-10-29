import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayClient } from '../index';
import { RatingItem } from '../gateway';

describe('CommentsClient', () => {
  const baseUrl = 'https://api.light-story.test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Comments API', () => {
    it('lists comments with pagination and parentId filter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'comm-1',
                  story_id: 's-1',
                  body: 'Amazing chapter!',
                  author: { display_name: 'Reader 1' },
                  like_count: 5,
                },
              ],
              total: 10,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.comments.listComments({
        storyId: 's-1',
        page: 1,
        pageSize: 10,
        sort: 'popular',
      });

      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stories/s-1/comments?page=1&pageSize=10&sort=popular'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('creates a new comment or reply', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'comm-2',
              storyId: 's-1',
              body: 'I agree with this theory!',
              parentId: 'comm-1',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const comment = await client.comments.createComment({
        storyId: 's-1',
        body: 'I agree with this theory!',
        parentId: 'comm-1',
      });

      expect(comment.id).toBe('comm-2');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/stories/s-1/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: 'I agree with this theory!', parentId: 'comm-1' }),
        }),
      );
    });

    it('deletes a comment by ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { success: true } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.comments.deleteComment('comm-1');

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/comments/comm-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('toggles like on a comment', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { liked: true, likeCount: 6 } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const res = await client.comments.toggleLike('comm-1');

      expect(res.liked).toBe(true);
      expect(res.likeCount).toBe(6);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.light-story.test/api/comments/comm-1/like',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('Ratings & Reviews API', () => {
    it('lists ratings and submits new rating', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                items: [
                  { id: 'r1', story_id: 's-1', user_id: 'u1', rating: 5, review: 'Masterpiece' },
                ],
                total: 1,
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: { id: 'r2', story_id: 's-1', user_id: 'u2', rating: 4, review: 'Great' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );

      const client = new GatewayClient({ baseUrl, fetch: mockFetch });
      const ratings = await client.comments.listRatings('s-1', { page: 1, pageSize: 10 });
      expect(ratings.items).toHaveLength(1);

      const submitted = await client.comments.submitRating({
        storyId: 's-1',
        rating: 4,
        review: 'Great',
      });
      expect(submitted.rating).toBe(4);
    });

    it('calculates rating summary distribution and average accurately', () => {
      const client = new GatewayClient({ baseUrl });
      const sampleRatings: RatingItem[] = [
        { id: '1', storyId: 's1', userId: 'u1', rating: 5, created_at: '', updated_at: '' },
        { id: '2', storyId: 's1', userId: 'u2', rating: 5, created_at: '', updated_at: '' },
        { id: '3', storyId: 's1', userId: 'u3', rating: 4, created_at: '', updated_at: '' },
        { id: '4', storyId: 's1', userId: 'u4', rating: 3, created_at: '', updated_at: '' },
        { id: '5', storyId: 's1', userId: 'u5', rating: 1, created_at: '', updated_at: '' },
      ];

      const summary = client.comments.calculateRatingSummary('s1', sampleRatings);
      expect(summary.totalRatings).toBe(5);
      // (5 + 5 + 4 + 3 + 1) / 5 = 18 / 5 = 3.6
      expect(summary.averageRating).toBe(3.6);
      expect(summary.distribution).toEqual({
        1: 1,
        2: 0,
        3: 1,
        4: 1,
        5: 2,
      });
    });

    it('handles empty rating list for summary', () => {
      const client = new GatewayClient({ baseUrl });
      const summary = client.comments.calculateRatingSummary('s-empty', []);

      expect(summary.totalRatings).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });
});
