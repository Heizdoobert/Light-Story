import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  act,
  publicRunError,
  GENERIC_ACTION_ERROR,
  SAFE_ACTION_ERROR_CODES,
} from '../result';
import {
  ActionUnauthorizedError,
  ActionForbiddenError,
  ActionRateLimitError,
} from '@/lib/security/permission';
import { logger } from '@/sdk/logger';

vi.mock('@/sdk/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

const RAW_PQ = 'pq: duplicate key value violates unique constraint "stories_slug_key"';

describe('act() ok:false sanitization', () => {
  const schema = z.string();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('2a: replaces raw pq text, drops details and unknown code, logs upstream error', async () => {
    const res = await act(schema, 'x', async () => ({
      ok: false,
      error: RAW_PQ,
      code: 'PGRST116',
      details: { stack: 'at handler (/srv/app/dist/server.js:10:5)' },
    }));
    expect(res.success).toBe(false);
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(res.code).toBeUndefined();
    expect(res.details).toBeUndefined();
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain(RAW_PQ);
    expect(serialized).not.toContain('stories_slug_key');
    expect(serialized).not.toContain('server.js');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ service: 'server-action', upstreamError: RAW_PQ, code: 'PGRST116' }),
    );
  });

  it('2b: known code NOT_FOUND maps to its safe message and keeps code', async () => {
    const res = await act(schema, 'x', async () => ({
      ok: false,
      error: 'row for story 42 not found in table stories',
      code: 'NOT_FOUND',
      details: { table: 'stories' },
    }));
    expect(res.error).toBe('Not found.');
    expect(res.code).toBe('NOT_FOUND');
    expect(res.details).toBeUndefined();
  });

  it('2c: GENERIC_ACTION_ERROR passthrough does not log a replacement', async () => {
    const res = await act(schema, 'x', async () => ({ ok: false, error: GENERIC_ACTION_ERROR }));
    expect(res.success).toBe(false);
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(['__proto__', 'toString'])('2d: inherited key %s is not treated as a safe code', async (code) => {
    const res = await act(schema, 'x', async () => ({ ok: false, error: RAW_PQ, code }));
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(res.code).toBeUndefined();
  });

  it('2e: preserves string requestId', async () => {
    const res = await act(schema, 'x', async () => ({ ok: false, error: RAW_PQ, requestId: 'req-1' }));
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(res.requestId).toBe('req-1');
  });

  it('2f: thrown ECONNREFUSED error yields generic error without raw text', async () => {
    const raw = 'connect ECONNREFUSED 127.0.0.1:5432';
    const res = await act(schema, 'x', async () => {
      throw new Error(raw);
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(JSON.stringify(res)).not.toContain('ECONNREFUSED');
  });

  it('2g: thrown permission errors pass their messages through', async () => {
    const unauthorized = await act(schema, 'x', async () => {
      throw new ActionUnauthorizedError();
    });
    expect(unauthorized.error).toBe('unauthorized');

    const forbidden = await act(schema, 'x', async () => {
      throw new ActionForbiddenError();
    });
    expect(forbidden.error).toBe('forbidden: insufficient permissions');

    const rateLimited = await act(schema, 'x', async () => {
      throw new ActionRateLimitError();
    });
    expect(rateLimited.error).toBe('too many requests, please try again later');

    const custom = await act(schema, 'x', async () => {
      throw new ActionForbiddenError('custom deny');
    });
    expect(custom.error).toBe('custom deny');
  });
});

describe('publicRunError', () => {
  it('2h: known own code returns mapped message and code', () => {
    for (const [code, message] of Object.entries(SAFE_ACTION_ERROR_CODES)) {
      expect(publicRunError({ error: 'raw', code })).toEqual({ error: message, code });
    }
  });

  it('2h: unknown code with unsafe message returns generic only', () => {
    expect(publicRunError({ error: RAW_PQ, code: 'PGRST116' })).toEqual({ error: GENERIC_ACTION_ERROR });
  });

  it('2h: inherited codes are rejected', () => {
    expect(publicRunError({ error: RAW_PQ, code: '__proto__' })).toEqual({ error: GENERIC_ACTION_ERROR });
    expect(publicRunError({ error: RAW_PQ, code: 'toString' })).toEqual({ error: GENERIC_ACTION_ERROR });
  });

  it('2h: safe passthrough message is kept without a code', () => {
    expect(publicRunError({ error: GENERIC_ACTION_ERROR })).toEqual({ error: GENERIC_ACTION_ERROR });
    expect(publicRunError({ error: 'Not found.' })).toEqual({ error: 'Not found.' });
  });

  it('2h: never forwards details', () => {
    const out = publicRunError({ error: RAW_PQ, code: 'NOT_FOUND', details: { stack: 's' } });
    expect(out).not.toHaveProperty('details');
  });

  it('2h: forwards requestId only when it is a string', () => {
    expect(publicRunError({ error: RAW_PQ, requestId: 'req-1' })).toEqual({
      error: GENERIC_ACTION_ERROR,
      requestId: 'req-1',
    });
    const bad = publicRunError({ error: RAW_PQ, requestId: 123 as unknown as string });
    expect(bad).not.toHaveProperty('requestId');
  });

  it('2h: SAFE_ACTION_ERROR_CODES is frozen', () => {
    expect(Object.isFrozen(SAFE_ACTION_ERROR_CODES)).toBe(true);
  });
});
