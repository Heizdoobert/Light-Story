/**
 * Test Suite: Semantic Search with pgvector
 * 
 * Tests the POST /api/rpc/search-stories endpoint with validation
 * Demonstrates:
 * - Valid search requests (1536-dim embedding, matchCount 1-100)
 * - Invalid embedding lengths (should reject)
 * - Invalid matchCount bounds (should reject)
 * - Server-side RPC call to search_stories()
 * 
 * Usage:
 * - Run in Next.js dev mode: npm run dev
 * - Then: curl -X POST http://localhost:3000/api/rpc/search-stories -H "Content-Type: application/json" -d @payload.json
 */

import { expect, describe, it, beforeEach } from 'vitest';

describe('POST /api/rpc/search-stories', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

  // Mock 1536-dimensional embedding (normally from ML model like OpenAI embeddings)
  const mockEmbedding1536 = new Array(1536).fill(0.5);
  const invalidEmbedding1024 = new Array(1024).fill(0.5);
  const invalidEmbedding2048 = new Array(2048).fill(0.5);

  describe('Valid requests', () => {
    it('should accept search with valid embedding and default matchCount', async () => {
      const payload = {
        embedding: mockEmbedding1536,
      };

        // Call the route handler directly to avoid network DNS issues in test runner
        const { POST } = await import('./route');
        const req = new Request('http://localhost/api/rpc/search-stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const res = await POST(req);
        const json = res.json ? await res.json() : JSON.parse(await res.text());
        expect(res.status).toBe(200);
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('count');
      expect(Array.isArray(json.results)).toBe(true);
    });

    it('should accept search with matchCount=10', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 10,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(json.count).toBeLessThanOrEqual(10);
    });

    it('should accept search with matchCount=100 (max)', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 100,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(200);
    });

    it('should accept search with matchCount=1 (min)', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 1,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(200);
    });
  });

  describe('Invalid requests (should fail validation)', () => {
    it('should reject embedding with length 1024 (not 1536)', async () => {
      const payload = {
        embedding: invalidEmbedding1024,
        matchCount: 10,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(400);
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid');
    });

    it('should reject embedding with length 2048 (not 1536)', async () => {
      const payload = {
        embedding: invalidEmbedding2048,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(400);
    });

    it('should reject matchCount=0 (below min)', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 0,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(400);
    });

    it('should reject matchCount=101 (above max)', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 101,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());
      expect(res.status).toBe(400);
    });

    it('should reject non-array embedding', async () => {
      const payload = {
        embedding: 'not-an-array',
        matchCount: 10,
      };

      const res = await fetch(`${baseUrl}/api/rpc/search-stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing embedding', async () => {
      const payload = {
        matchCount: 10,
      };

      const res = await fetch(`${baseUrl}/api/rpc/search-stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Response format', () => {
    it('should return results with correct schema', async () => {
      const payload = {
        embedding: mockEmbedding1536,
        matchCount: 5,
      };

      const { POST } = await import('./route');
      const req = new Request('http://localhost/api/rpc/search-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      const json = res.json ? await res.json() : JSON.parse(await res.text());

      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('count');
      expect(json.count).toEqual(json.results.length);

      // If results exist, check their structure
      if (json.results.length > 0) {
        const result = json.results[0];
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('cover_url');
        expect(result).toHaveProperty('similarity');
      }
    });
  });
});

/**
 * Integration Test: Real pgvector Search Example
 * 
 * Run manually:
 * 1. Start Next.js dev server: npm run dev
 * 2. Create a test embedding (or use real OpenAI embeddings)
 * 3. POST to /api/rpc/search-stories
 * 
 * Example payload (from OpenAI embeddings API):
 * {
 *   "embedding": [0.5, 0.2, 0.8, ...1536 floats total...],
 *   "matchCount": 10
 * }
 * 
 * Expected response:
 * {
 *   "results": [
 *     {
 *       "id": "uuid",
 *       "title": "Story Title",
 *       "summary": "...",
 *       "cover_url": "https://...",
 *       "similarity": 0.95
 *     },
 *     ...
 *   ],
 *   "count": 10
 * }
 */
