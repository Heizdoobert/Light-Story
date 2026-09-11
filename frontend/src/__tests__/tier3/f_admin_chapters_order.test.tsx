import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminChapters } from '@/hooks/features/use-admin-chapters';

const supabaseMock = vi.hoisted(() => {
  const calls: { select: string; column: string; ascending: boolean }[] = [];
  const results: Record<string, unknown> = {};
  let currentSelect = '';

  const chain: Record<string, unknown> = {
    from: () => chain,
    select: (cols: string) => {
      currentSelect = cols;
      return chain;
    },
    eq: () => chain,
    order: (column: string, opts: { ascending: boolean } | undefined) => {
      calls.push({ select: currentSelect, column, ascending: opts?.ascending ?? true });
      return chain;
    },
    limit: () => chain,
    then: async (resolve: (value: unknown) => void) => {
      resolve({ data: results[currentSelect] ?? [] });
    },
  };
  return { chain, calls, results };
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => supabaseMock.chain,
}));

vi.mock('@/lib/actions/chapter.actions', () => ({
  createChapter: vi.fn(),
  updateChapter: vi.fn(),
  deleteChapter: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const CHAPTERS_SELECT = 'id, story_id, chapter_number, title, created_at, content';

describe('useAdminChapters ordering (regression guard)', () => {
  beforeEach(() => {
    supabaseMock.calls.length = 0;
    supabaseMock.results[CHAPTERS_SELECT] = [
      { id: 'ch-3', story_id: 'c1', chapter_number: 3, title: '', created_at: '2026-01-01', content: null },
      { id: 'ch-1', story_id: 'c1', chapter_number: 1, title: '', created_at: '2026-06-01', content: null },
    ];
    supabaseMock.results['id, title'] = [{ id: 'c1', title: 'Truyện A' }];
    supabaseMock.results['chapter_number'] = [{ chapter_number: 42 }];
  });

  it('builds the chapters query with ascending chapter_number order', async () => {
    renderHook(() => useAdminChapters('c1'));

    await waitFor(() => {
      expect(
        supabaseMock.calls.some(
          (c) =>
            c.select === CHAPTERS_SELECT &&
            c.column === 'chapter_number' &&
            c.ascending === true,
        ),
      ).toBe(true);
    });
  });

  it('create modal defaults to real max chapter_number + 1, independent of list order', async () => {
    const { result } = renderHook(() => useAdminChapters('c1'));

    await waitFor(() => expect(supabaseMock.calls.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleOpenCreateModal();
    });

    expect(result.current.chapterNumber).toBe(43);
  });
});
