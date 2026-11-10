import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
}));

import { CounterDO } from '../src/do/counter.do';
import gateway from '../src/index';

function createMockStorage() {
  const map = new Map<string, any>();
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return map.get(key);
    },
    async put(key: string, val: any): Promise<void> {
      map.set(key, val);
    },
    map,
  };
}

describe('CounterDO Unit Tests', () => {
  it('increments and retrieves typed hot-counters per entity ID', async () => {
    const storage = createMockStorage();
    const mockState = { storage } as unknown as DurableObjectState;
    const counter = new CounterDO(mockState, {});

    // 1. Increment like
    const incRes1 = await counter.fetch(
      new Request('https://do.internal/increment?type=like&id=story-123', { method: 'POST' }),
    );
    expect(incRes1.status).toBe(200);
    const incData1 = await incRes1.json();
    expect(incData1).toEqual({ like: 1 });

    // 2. Increment like again
    const incRes2 = await counter.fetch(
      new Request('https://do.internal/increment?type=like&id=story-123', { method: 'POST' }),
    );
    const incData2 = await incRes2.json();
    expect(incData2).toEqual({ like: 2 });

    // 3. Increment bookmark (isolated from like)
    const incBookmark = await counter.fetch(
      new Request('https://do.internal/increment?type=bookmark&id=story-123', { method: 'POST' }),
    );
    const bookmarkData = await incBookmark.json();
    expect(bookmarkData).toEqual({ bookmark: 1 });

    // 4. Get like count
    const getRes = await counter.fetch(
      new Request('https://do.internal/get?type=like&id=story-123', { method: 'GET' }),
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData).toEqual({ like: 2 });
  });

  it('supports legacy counter without entityId for backward compatibility', async () => {
    const storage = createMockStorage();
    const mockState = { storage } as unknown as DurableObjectState;
    const counter = new CounterDO(mockState, {});

    const incRes = await counter.fetch(
      new Request('https://do.internal/increment', { method: 'POST' }),
    );
    expect(await incRes.json()).toEqual({ count: 1 });

    const getRes = await counter.fetch(
      new Request('https://do.internal/get', { method: 'GET' }),
    );
    expect(await getRes.json()).toEqual({ count: 1 });
  });

  it('gateway routes /increment and /get to env.COUNTER_DO namespace stub', async () => {
    const storage = createMockStorage();
    const mockState = { storage } as unknown as DurableObjectState;
    const counter = new CounterDO(mockState, {});

    const stub = {
      fetch: vi.fn((req: Request) => counter.fetch(req)),
    };
    const mockNamespace = {
      idFromName: vi.fn((name: string) => ({ toString: () => name })),
      get: vi.fn(() => stub),
    } as unknown as DurableObjectNamespace;

    const env = {
      COUNTER_DO: mockNamespace,
    } as unknown as Env;

    const req = new Request('https://gateway.test/increment?type=like&id=story-999', {
      method: 'POST',
    });
    const ctx = {} as ExecutionContext;

    const res = await gateway.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ like: 1 });
    expect(mockNamespace.idFromName).toHaveBeenCalledWith('story-999');
    expect(stub.fetch).toHaveBeenCalled();
  });

  it('returns 503 when COUNTER_DO is not configured', async () => {
    const env = {} as Env;
    const req = new Request('https://gateway.test/increment?type=view&id=story-1', {
      method: 'POST',
    });
    const ctx = {} as ExecutionContext;

    const res = await gateway.fetch(req, env, ctx);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toMatchObject({ success: false, error: 'COUNTER_DO_NOT_CONFIGURED' });
  });
});
