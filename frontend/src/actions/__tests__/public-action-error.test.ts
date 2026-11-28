import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { act, publicActionError, GENERIC_ACTION_ERROR } from '../result';
import {
  ActionUnauthorizedError,
  ActionForbiddenError,
  ActionRateLimitError,
} from '@/lib/security/permission';

vi.mock('@/sdk/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

describe('publicActionError', () => {
  it('returns the message for ActionUnauthorizedError', () => {
    expect(publicActionError(new ActionUnauthorizedError())).toBe('unauthorized');
  });

  it('returns the message for ActionForbiddenError', () => {
    expect(publicActionError(new ActionForbiddenError())).toBe('forbidden: insufficient permissions');
  });

  it('returns the message for ActionRateLimitError', () => {
    expect(publicActionError(new ActionRateLimitError())).toBe('too many requests, please try again later');
  });

  it('returns the generic error for raw Error, string and undefined', () => {
    expect(publicActionError(new Error('duplicate key value violates unique constraint "x"'))).toBe(GENERIC_ACTION_ERROR);
    expect(publicActionError('some string')).toBe(GENERIC_ACTION_ERROR);
    expect(publicActionError(undefined)).toBe(GENERIC_ACTION_ERROR);
  });
});

describe('act() error sanitization', () => {
  it('does not leak raw error text from a thrown Error', async () => {
    const res = await act(z.object({}), {}, async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.1:5432');
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe(GENERIC_ACTION_ERROR);
    expect(res.error).not.toContain('ECONNREFUSED');
  });

  it('passes through the permission message for ActionForbiddenError', async () => {
    const res = await act(z.object({}), {}, async () => {
      throw new ActionForbiddenError();
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('forbidden: insufficient permissions');
  });
});
