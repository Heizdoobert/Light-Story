import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStoryMutations } from '../useStoryMutations';
import * as storyActions from '@/actions/story.actions';

vi.mock('@/actions/story.actions', () => ({
  toggleStoryLike: vi.fn(),
  incrementStoryView: vi.fn(),
}));

describe('useStoryMutations hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('triggers toggleStoryLike server action via useLikeStoryMutation', async () => {
    vi.mocked(storyActions.toggleStoryLike).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useStoryMutations(), { wrapper });
    const likeMutation = renderHook(() => result.current.useLikeStoryMutation(), { wrapper });

    await act(async () => {
      await likeMutation.result.current.mutateAsync({ storyId: 'story-123' });
    });

    expect(storyActions.toggleStoryLike).toHaveBeenCalledWith('story-123');
  });

  it('triggers incrementStoryView server action via useIncrementViewMutation', async () => {
    vi.mocked(storyActions.incrementStoryView).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useStoryMutations(), { wrapper });
    const viewMutation = renderHook(() => result.current.useIncrementViewMutation(), { wrapper });

    await act(async () => {
      await viewMutation.result.current.mutateAsync('story-123');
    });

    expect(storyActions.incrementStoryView).toHaveBeenCalledWith('story-123');
  });

  it('throws error when toggleStoryLike fails', async () => {
    vi.mocked(storyActions.toggleStoryLike).mockResolvedValue({
      success: false,
      error: 'Like failed',
    });

    const { result } = renderHook(() => useStoryMutations(), { wrapper });
    const likeMutation = renderHook(() => result.current.useLikeStoryMutation(), { wrapper });

    await expect(
      act(async () => {
        await likeMutation.result.current.mutateAsync({ storyId: 'story-123' });
      }),
    ).rejects.toThrow('Like failed');
  });
});
