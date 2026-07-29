import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ test: true })) }));

const mockGetAll = vi.fn(() => []);
const mockSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: mockGetAll, set: mockSet })),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('createClient', () => {
  it('creates supabase server client with cookie store', async () => {
    const { createClient } = await import('./server');
    const { createServerClient } = await import('@supabase/ssr');

    const client = await createClient();

    expect(createServerClient).toHaveBeenCalledOnce();
    expect(createServerClient).toHaveBeenCalledWith(
      undefined, undefined,
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
    expect(client).toEqual({ test: true });
  });
});