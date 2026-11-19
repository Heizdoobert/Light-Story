import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithHeaderTimeout } from '../utils/fetch-timeout';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchWithHeaderTimeout', () => {
  it('aborts when the upstream sends no headers within the limit', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })));
    await expect(fetchWithHeaderTimeout('https://x.test/slow', {}, 20)).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('does not cut a body that keeps streaming after the limit', async () => {
    let seenSignal: AbortSignal | undefined;
    const encoder = new TextEncoder();
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init: RequestInit) => {
      seenSignal = init.signal ?? undefined;
      const body = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('part1-'));
          await new Promise((r) => setTimeout(r, 60));
          controller.enqueue(encoder.encode('part2'));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    }));
    const res = await fetchWithHeaderTimeout('https://x.test/big', {}, 20);
    expect(await res.text()).toBe('part1-part2');
    expect(seenSignal?.aborted).toBe(false);
  });

  it('honours a caller abort signal', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })));
    const caller = new AbortController();
    const pending = fetchWithHeaderTimeout('https://x.test/a', { signal: caller.signal }, 10_000);
    caller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
