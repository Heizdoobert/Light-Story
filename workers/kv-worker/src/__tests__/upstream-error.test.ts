import { describe, expect, it, vi } from 'vitest';
import { safeUpstreamMessage, upstreamError } from '../utils/supabase-client';

describe('upstream errors', () => {
  it('hides relation details and uses the stable error code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = upstreamError(500, { code: '42P01', message: 'relation \"secret_table\" does not exist' });
      const body = await res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('SUPABASE_ERROR');
      expect(body.error.message).toBe('Upstream service error');
      expect(JSON.stringify(body)).not.toContain('secret_table');
    } finally { log.mockRestore(); }
  });

  it('maps duplicate keys without exposing the constraint', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = upstreamError(409, JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint \"stories_slug_key\"' }));
      const body = await res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('SUPABASE_ERROR');
      expect(body.error.message).toBe('Conflict: resource already exists');
      expect(JSON.stringify(body)).not.toContain('stories_slug_key');
    } finally { log.mockRestore(); }
  });

  it('maps status and database codes in precedence order', () => {
    expect(safeUpstreamMessage(500, { code: '23505' })).toBe('Upstream service error');
    expect(safeUpstreamMessage(404, { code: '23505' })).toBe('Conflict: resource already exists');
    expect(safeUpstreamMessage(400, { code: '23503' })).toBe('Invalid reference');
    expect(safeUpstreamMessage(400, { code: '23514' })).toBe('Invalid input');
    expect(safeUpstreamMessage(400, JSON.stringify({ code: '22P02' }))).toBe('Invalid input');
    expect(safeUpstreamMessage(401, null)).toBe('Unauthorized');
    expect(safeUpstreamMessage(403, null)).toBe('Forbidden');
    expect(safeUpstreamMessage(404, 'not json')).toBe('Not found');
    expect(safeUpstreamMessage(400, 'not json')).toBe('Request failed');
  });

  it('returns a nested not found error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = upstreamError(404, 'not json');
      const body = await res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('SUPABASE_ERROR');
      expect(body.error.message).toBe('Not found');
    } finally { log.mockRestore(); }
  });

  it('truncates the server-side raw body log', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      upstreamError(400, 'x'.repeat(600));
      expect(log).toHaveBeenCalledWith('[Supabase] Upstream error:', 'x'.repeat(500));
    } finally { log.mockRestore(); }
  });
});
