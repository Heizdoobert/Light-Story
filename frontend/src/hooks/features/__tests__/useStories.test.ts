import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStories } from '../useStories';
import * as storyService from '@/services/comics/story.service';
import * as storiesActions from '@/actions/stories.actions';
import { toast } from 'sonner';

vi.mock('@/services/comics/story.service', () => ({
  fetchStories: vi.fn(),
}));

vi.mock('@/actions/stories.actions', () => ({
  incrementStoryView: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('useStories hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('fetches stories via storyService using react-query', async () => {
    const mockStories = [{ id: 's1', title: 'Story 1', views: 10 }];
    vi.mocked(storyService.fetchStories).mockResolvedValue(mockStories as any);

    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.stories).toEqual(mockStories);
    });

    expect(storyService.fetchStories).toHaveBeenCalled();
  });

  it('calls incrementStoryView server action directly when incrementView is invoked', async () => {
    vi.mocked(storyService.fetchStories).mockResolvedValue([]);
    vi.mocked(storiesActions.incrementStoryView).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useStories(), { wrapper });

    let actionRes;
    await act(async () => {
      actionRes = await result.current.incrementView('s1');
    });

    expect(storiesActions.incrementStoryView).toHaveBeenCalledWith('s1');
    expect(actionRes).toEqual({ success: true });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows error toast when server action incrementStoryView fails', async () => {
    vi.mocked(storyService.fetchStories).mockResolvedValue([]);
    vi.mocked(storiesActions.incrementStoryView).mockResolvedValue({
      success: false,
      error: 'Network error',
    });

    const { result } = renderHook(() => useStories(), { wrapper });

    let actionRes;
    await act(async () => {
      actionRes = await result.current.incrementView('s1');
    });

    expect(storiesActions.incrementStoryView).toHaveBeenCalledWith('s1');
    expect(actionRes).toEqual({ success: false, error: 'Network error' });
    expect(toast.error).toHaveBeenCalledWith('Failed to increment view');
  });
});
