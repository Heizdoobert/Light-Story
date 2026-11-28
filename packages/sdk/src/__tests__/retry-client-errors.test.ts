import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../client';
import { GatewayError, SdkNetworkError } from '../errors';
import {
  calculateRetryDelay,
  isMethodIdempotent,
  resolveRetryConfig,
  shouldRetryRequest,
  sleepWithSignal,
} from '../retry';

const baseUrl = 'https://api.light-story.test';

const okResponse = (data: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });

function fetchClient(fetchImpl: typeof fetch, retry: false | object = false) {
  return new HttpClient({ baseUrl, fetch: fetchImpl, retry });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('retry helpers', () => {
  it('resolves disabled, default and fully custom configs', () => {
    expect(resolveRetryConfig(false).maxRetries).toBe(0);
    expect(resolveRetryConfig(true).retryMethods).toContain('GET');
    const cfg = resolveRetryConfig({
      maxRetries: 0,
      backoffBaseMs: 1,
      maxDelayMs: 2,
      retryStatusCodes: [418],
      retryMethods: ['get'],
    });
    expect(cfg.retryMethods).toEqual(['GET']);
    expect(cfg.retryStatusCodes).toEqual([418]);
    expect(isMethodIdempotent('get', cfg.retryMethods)).toBe(true);
    expect(isMethodIdempotent('post', cfg.retryMethods)).toBe(false);
  });

  it('stops at max attempts, honours opt-out and non-retryable methods/statuses', () => {
    const cfg = resolveRetryConfig({ maxRetries: 2 });
    expect(shouldRetryRequest('GET', 2, 503, cfg)).toBe(false);
    expect(shouldRetryRequest('GET', 0, 503, cfg, false)).toBe(false);
    expect(shouldRetryRequest('POST', 0, 503, cfg)).toBe(false);
    expect(shouldRetryRequest('GET', 0, 200, cfg)).toBe(false);
    expect(shouldRetryRequest('GET', 0, 503, cfg)).toBe(true);
    expect(shouldRetryRequest('GET', 0, null as never, cfg)).toBe(false);
  });

  it('retries network errors but not caller aborts unless they are timeouts', () => {
    const cfg = resolveRetryConfig({ maxRetries: 2 });
    expect(shouldRetryRequest('GET', 0, new Error('net'), cfg)).toBe(true);
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(shouldRetryRequest('GET', 0, abort, cfg)).toBe(false);
    Object.assign(abort, { isTimeout: true });
    expect(shouldRetryRequest('GET', 0, abort, cfg)).toBe(true);
  });

  it('handles Retry-After seconds, dates, oversized values and backoff', () => {
    const cfg = resolveRetryConfig({ backoffBaseMs: 100, maxDelayMs: 5000 });
    expect(calculateRetryDelay(0, cfg, new Headers({ 'retry-after': '0.2' }))).toBe(200);
    expect(calculateRetryDelay(0, cfg, new Headers({ 'retry-after': '20' }))).toBe(-1);
    expect(calculateRetryDelay(0, cfg, new Headers({ 'retry-after': '0' }))).toBe(0);
    const future = new Headers({ 'retry-after': new Date(Date.now() + 1000).toUTCString() });
    expect(calculateRetryDelay(0, cfg, future)).toBeGreaterThan(0);
    const past = new Headers({ 'retry-after': new Date(Date.now() - 10000).toUTCString() });
    expect(calculateRetryDelay(0, cfg, past)).toBeGreaterThanOrEqual(10);
    expect(calculateRetryDelay(0, cfg, new Headers({ 'retry-after': 'not-a-date' }))).toBeGreaterThanOrEqual(10);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(calculateRetryDelay(0, cfg)).toBe(50);
  });

  it('resolves, rejects on pre-abort and rejects on abort during sleep', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    void sleepWithSignal(100).then(done);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalledOnce();

    const reason = new Error('stopped');
    const preAborted = new AbortController();
    preAborted.abort(reason);
    await expect(sleepWithSignal(100, preAborted.signal)).rejects.toBe(reason);

    const late = new AbortController();
    const pending = sleepWithSignal(100, late.signal);
    late.abort();
    await expect(pending).rejects.toThrow();
  });
});

describe('HttpClient retry and error branches', () => {
  it('handles empty base URLs, absolute URLs, relative URLs and param filtering', () => {
    expect(new HttpClient().getBaseUrl()).toBe('');
    const client = new HttpClient();
    const absolute = client.buildUrl(`${baseUrl}/abs?old=1`, { fresh: 2, skip: undefined, none: null });
    expect(absolute).toContain('fresh=2');
    expect(absolute).not.toContain('skip');
    expect(absolute).not.toContain('none');
    expect(client.buildUrl('/rel?x=1')).toBe('/rel?x=1');
    expect(new HttpClient({ baseUrl }).buildUrl('rel')).toBe(`${baseUrl}/rel`);
  });

  it('serializes every supported body form without overwriting content type', () => {
    const client = new HttpClient();
    const serialize = (body: unknown, headers = new Headers()) =>
      (client as unknown as { serializeBody: (b: unknown, h: Headers) => BodyInit | undefined })
        .serializeBody(body, headers);

    expect(serialize(undefined)).toBeUndefined();
    expect(serialize(null)).toBeUndefined();
    expect(serialize('plain')).toBe('plain');
    expect(serialize(new FormData())).toBeInstanceOf(FormData);
    expect(serialize(new Blob(['x']))).toBeInstanceOf(Blob);
    expect(serialize(new Uint8Array([1]))).toBeInstanceOf(Uint8Array);
    expect(serialize(new URLSearchParams({ a: '1' }))).toBeInstanceOf(URLSearchParams);
    expect(serialize(7)).toBe('7');

    const headers = new Headers();
    expect(JSON.parse(String(serialize({ a: 1 }, headers)))).toEqual({ a: 1 });
    expect(headers.get('content-type')).toBe('application/json');
    const preset = new Headers({ 'Content-Type': 'text/plain' });
    serialize({ a: 1 }, preset);
    expect(preset.get('content-type')).toBe('text/plain');
  });

  it('merges request interceptor patches, honours lowercase methods and preset Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    const client = fetchClient(fetchMock);
    client.interceptors.request.use(() => ({ headers: { Authorization: 'Bearer preset', 'X-Patch': 'yes' } }));

    const result = await client.request('/api/patch', {
      method: 'get',
      headers: { Authorization: 'Bearer preset' },
    });

    expect(result).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('GET');
    const headers = new Headers(init.headers);
    expect(headers.get('X-Patch')).toBe('yes');
    expect(headers.get('Authorization')).toBe('Bearer preset');
  });

  it('lets response interceptors return undefined, respects timeoutMs=0 and per-request retry config', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    const client = new HttpClient({ baseUrl, fetch: fetchMock, retry: false, timeoutMs: 0 });
    client.interceptors.response.use(() => undefined);
    expect(await client.get('/api/x', { retry: { maxRetries: 0 } })).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to global fetch and rejects non-Error fetch failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new HttpClient({ baseUrl, retry: false }).get('/api/x')).resolves.toEqual({ ok: true });

    const failing = vi.fn().mockRejectedValue('plain failure');
    await expect(fetchClient(failing).get('/api/x')).rejects.toBeInstanceOf(SdkNetworkError);
  });

  it('throws the caller abort reason when aborted during an in-flight fetch', async () => {
    let rejectFetch!: (error: Error) => void;
    const pending = new Promise<Response>((_resolve, reject) => {
      rejectFetch = reject;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    const reason = new Error('caller cancelled');
    const controller = new AbortController();
    const request = fetchClient(fetchMock).get('/api/x', { signal: controller.signal });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    controller.abort(reason);
    rejectFetch(new Error('fetch aborted'));
    await expect(request).rejects.toBe(reason);
  });

  it('survives unparseable JSON/text responses and stops on Retry-After beyond max delay', async () => {
    const noContentType = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.reject(new Error('no json')),
      text: () => Promise.reject(new Error('no text')),
    } as unknown as Response;
    await expect(fetchClient(vi.fn().mockResolvedValue(noContentType)).get('/api/x')).resolves.toBeNull();

    const badJson = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.reject(new Error('bad json')),
      text: () => Promise.resolve(''),
    } as unknown as Response;
    await expect(fetchClient(vi.fn().mockResolvedValue(badJson)).get('/api/x')).resolves.toBeNull();

    const retryAfter = new Response('busy', {
      status: 503,
      headers: { 'retry-after': '100' },
    });
    const fetchMock = vi.fn().mockResolvedValue(retryAfter);
    const client = new HttpClient({
      baseUrl,
      fetch: fetchMock,
      retry: { maxRetries: 2, backoffBaseMs: 1, maxDelayMs: 10 },
    });
    await expect(client.get('/api/x')).rejects.toBeInstanceOf(GatewayError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('raises typed GatewayError for success:false envelopes with every request id source', async () => {
    const cases: Array<{ data: unknown; headers?: Record<string, string>; requestId?: string; options?: { headers?: Record<string, string> } }> = [
      { data: { success: false } },
      { data: { success: false, error: { message: 'bad' } }, headers: { 'x-request-id': 'from-header' }, requestId: 'from-header' },
      { data: { success: false, error: { message: 'bad' }, requestId: 'from-envelope' }, options: { headers: { 'x-request-id': '' } }, requestId: 'from-envelope' },
      { data: { success: false, error: { message: 'bad', code: 'CUSTOM', requestId: 'from-error' }, details: { a: 1 } }, headers: { 'X-Request-Id': 'upper' }, requestId: 'upper' },
    ];

    for (const { data, headers, requestId, options } of cases) {
      const fetchMock = vi.fn().mockResolvedValue(okResponse(data, headers));
      try {
        await fetchClient(fetchMock).get('/api/x', options);
        throw new Error('expected GatewayError');
      } catch (error) {
        expect(error).toBeInstanceOf(GatewayError);
        const gatewayError = error as GatewayError;
        expect(gatewayError.code).toBe(data === cases[3].data ? 'CUSTOM' : 'GATEWAY_ERROR');
        if (requestId === undefined) {
          expect(gatewayError.requestId).toMatch(/^req_/);
        } else {
          expect(gatewayError.requestId).toBe(requestId);
        }
      }
    }
  });
});
