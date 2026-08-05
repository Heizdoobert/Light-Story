import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { act } from '../result';

const schema = z.object({
  name: z.string().min(2),
  count: z.number().int().nonnegative(),
});

describe('act server-action helper', () => {
  it('handles success case (valid input, handler returns data)', async () => {
    const result = await act(schema, { name: 'valid', count: 5 }, async (parsed) => {
      expect(parsed).toEqual({ name: 'valid', count: 5 });
      return { ok: true as const, data: { id: '123', status: 'created' } };
    });

    expect(result).toEqual({
      success: true,
      data: { id: '123', status: 'created' },
    });
  });

  it('handles validation error case (invalid input against schema, returns sanitized error)', async () => {
    const result = await act(schema, { name: 'a', count: -1 }, async () => ({ ok: true as const }));

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toContain('Invalid input');
    expect(result.error).toContain('name');
  });

  it('handles thrown error case (handler throws Error, returns sanitized error message)', async () => {
    const result = await act(schema, { name: 'valid', count: 5 }, async () => {
      throw new Error('Database connection failed');
    });

    expect(result).toEqual({
      success: false,
      error: 'Database connection failed',
    });
  });
});
