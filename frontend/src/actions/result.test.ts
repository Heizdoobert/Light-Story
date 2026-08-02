import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { act } from './result';

const schema = z.object({ name: z.string().min(2), count: z.number().int().nonnegative() });

describe('act', () => {
  it('returns success with data when input parses and run succeeds', async () => {
    const result = await act(schema, { name: 'ok', count: 1 }, async (parsed) => {
      expect(parsed).toEqual({ name: 'ok', count: 1 });
      return { ok: true as const, data: { saved: true } };
    });
    expect(result).toEqual({ success: true, data: { saved: true } });
  });

  it('returns success with no data when run returns ok without data', async () => {
    const result = await act(schema, { name: 'ok', count: 1 }, async () => ({ ok: true as const }));
    expect(result).toEqual({ success: true });
  });

  it('returns failure with human-readable message on zod validation failure', async () => {
    const result = await act(schema, { name: 'x', count: -1 }, async () => ({ ok: true as const }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid input');
    expect(result.error).toContain('name');
    expect(result.error).not.toContain('issues');
    expect(result.error).not.toContain('code');
  });

  it('returns failure with the run-provided error when run reports failure', async () => {
    const result = await act(schema, { name: 'ok', count: 1 }, async () => ({
      ok: false as const,
      error: 'already exists',
    }));
    expect(result).toEqual({ success: false, error: 'already exists' });
  });

  it('sanitizes thrown errors from run', async () => {
    const result = await act(schema, { name: 'ok', count: 1 }, async () => {
      throw new Error('boom');
    });
    expect(result).toEqual({ success: false, error: 'boom' });
  });
});
