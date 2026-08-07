import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { act } from '../result';
import { fetchApi, messageFromResponse } from '../http';
import * as serverApi from '@/lib/api/server';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

describe('Phase P0 Edge Cases - act() helper', () => {
  const userSchema = z.object({
    id: z.string().uuid(),
    age: z.number().min(18),
    tags: z.array(z.string()),
  });

  it('handles null/undefined input gracefully', async () => {
    const resNull = await act(userSchema, null, async () => ({ ok: true }));
    expect(resNull.success).toBe(false);
    expect(resNull.error).toContain('Invalid input');

    const resUndefined = await act(userSchema, undefined, async () => ({ ok: true }));
    expect(resUndefined.success).toBe(false);
    expect(resUndefined.error).toContain('Invalid input');
  });

  it('formats root primitive schema validation error with "input:" fallback', async () => {
    const stringSchema = z.string().min(3);
    const res = await act(stringSchema, 123, async () => ({ ok: true }));
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid input: input: Invalid input: expected string, received number');
  });

  it('formats nested object schema errors with dot-separated path', async () => {
    const res = await act(userSchema, { id: 'not-a-uuid', age: 10, tags: [123] }, async () => ({ ok: true }));
    expect(res.success).toBe(false);
    expect(res.error).toContain('id: Invalid UUID');
    expect(res.error).toContain('age: Too small: expected number to be >=18');
    expect(res.error).toContain('tags.0: Invalid input: expected string, received number');
  });

  it('handles thrown non-Error string in handler', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', async () => {
      throw 'Raw string error thrown';
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Raw string error thrown');
  });

  it('handles thrown non-Error object in handler', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', async () => {
      throw { message: 'Object error message' };
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Object error message');
  });

  it('handles thrown null/undefined in handler with fallback message', async () => {
    const stringSchema = z.string();
    const resNull = await act(stringSchema, 'hello', async () => {
      throw null;
    });
    expect(resNull.success).toBe(false);
    expect(resNull.error).toBe('An error occurred. Please try again in a moment.');

    const resUndefined = await act(stringSchema, 'hello', async () => {
      throw undefined;
    });
    expect(resUndefined.success).toBe(false);
    expect(resUndefined.error).toBe('An error occurred. Please try again in a moment.');
  });

  it('handles thrown primitive number in handler', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', async () => {
      throw 404;
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('404');
  });

  it('handles async handlers that reject a Promise', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', () => Promise.reject(new Error('Async rejection')));
    expect(res.success).toBe(false);
    expect(res.error).toBe('Async rejection');
  });

  it('handles handler returning ok: true without data field', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', async () => ({ ok: true }));
    expect(res.success).toBe(true);
    expect(res.data).toBeUndefined();
  });

  it('handles handler returning ok: false with error string', async () => {
    const stringSchema = z.string();
    const res = await act(stringSchema, 'hello', async () => ({ ok: false, error: 'Custom business rule failure' }));
    expect(res.success).toBe(false);
    expect(res.error).toBe('Custom business rule failure');
  });
});

describe('Phase P0 Edge Cases - http.ts (messageFromResponse & fetchApi)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('messageFromResponse', () => {
    it('extracts top-level string error', async () => {
      const res = new Response(JSON.stringify({ error: 'Direct error string' }), { status: 400 });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('Direct error string');
    });

    it('extracts nested error.message object', async () => {
      const res = new Response(JSON.stringify({ error: { message: 'Nested error object message' } }), { status: 400 });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('Nested error object message');
    });

    it('extracts top-level message property', async () => {
      const res = new Response(JSON.stringify({ message: 'Top-level message' }), { status: 400 });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('Top-level message');
    });

    it('falls back to statusText or status when JSON has no matching error fields', async () => {
      const res = new Response(JSON.stringify({ otherField: 123 }), { status: 404, statusText: 'Not Found' });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('Not Found');
    });

    it('falls back to HTTP Error status when statusText is empty and JSON is non-error', async () => {
      const res = new Response(JSON.stringify({ foo: 'bar' }), { status: 500 });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('HTTP Error 500');
    });

    it('falls back gracefully when response is invalid JSON', async () => {
      const res = new Response('<html>500 Internal Server Error</html>', { status: 500, statusText: 'Server Error' });
      const msg = await messageFromResponse(res);
      expect(msg).toBe('Server Error');
    });
  });

  describe('fetchApi', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    });

    it('attaches auth bearer header when session exists and auto-sets Content-Type for JSON body', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'test-token-123' } },
          }),
        },
      } as any);

      await fetchApi('/test-endpoint', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/test-endpoint');
      const headers = init?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('does NOT set application/json Content-Type when body is FormData', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
      } as any);

      const formData = new FormData();
      formData.append('file', 'test');

      await fetchApi('/upload', {
        method: 'POST',
        body: formData,
      });

      const [, init] = vi.mocked(global.fetch).mock.calls[0];
      const headers = init?.headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('Content-Type')).toBeNull();
    });

    it('throws when no gateway URL is configured (mock fallback removed)', async () => {
      const prev = process.env.NEXT_PUBLIC_GATEWAY_URL;
      const prevProd = process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION;
      delete process.env.NEXT_PUBLIC_GATEWAY_URL;
      delete process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION;

      try {
        await expect(fetchApi('/route')).rejects.toThrow(
          'NEXT_PUBLIC_GATEWAY_URL',
        );
      } finally {
        if (prev !== undefined) process.env.NEXT_PUBLIC_GATEWAY_URL = prev;
        if (prevProd !== undefined) process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION = prevProd;
      }
    });
  });
});
