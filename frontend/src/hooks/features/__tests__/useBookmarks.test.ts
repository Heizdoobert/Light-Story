import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBookmarks } from '../useBookmarks';
import * as readerHubService from '@/services/reader/readerHub.service';
import * as bookmarksActions from '@/actions/bookmarks.actions';

vi.mock('@/services/reader/readerHub.service', () => ({
  getBookmarks: vi.fn(),
}));

vi.mock('@/actions/bookmarks.actions', () => ({
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  toggleBookmark: vi.fn(),
}));

describe('useBookmarks hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('fetches bookmarks via readerHubService using react-query', async () => {
    vi.mocked(readerHubService.getBookmarks).mockResolvedValue(['comic-101', 'comic-102']);

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.bookmarks).toEqual(['comic-101', 'comic-102']);
    });

    expect(readerHubService.getBookmarks).toHaveBeenCalled();
    expect(result.current.isBookmarked('comic-101')).toBe(true);
    expect(result.current.isBookmarked('comic-999')).toBe(false);
  });

  it('calls toggleBookmark server action when toggleBookmark is invoked', async () => {
    vi.mocked(readerHubService.getBookmarks).mockResolvedValue(['comic-101']);
    vi.mocked(bookmarksActions.toggleBookmark).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.bookmarks).toEqual(['comic-101']);
    });

    let toggled;
    await act(async () => {
      toggled = await result.current.toggleBookmark('comic-101');
    });

    expect(bookmarksActions.toggleBookmark).toHaveBeenCalledWith('comic-101');
    expect(toggled).toBe(false);
  });

  it('calls addBookmark server action when addBookmark is invoked', async () => {
    vi.mocked(readerHubService.getBookmarks).mockResolvedValue([]);
    vi.mocked(bookmarksActions.addBookmark).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let added;
    await act(async () => {
      added = await result.current.addBookmark('comic-101');
    });

    expect(bookmarksActions.addBookmark).toHaveBeenCalledWith('comic-101');
    expect(added).toBe(true);
  });

  it('calls removeBookmark server action when removeBookmark is invoked', async () => {
    vi.mocked(readerHubService.getBookmarks).mockResolvedValue(['comic-101']);
    vi.mocked(bookmarksActions.removeBookmark).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.bookmarks).toEqual(['comic-101']);
    });

    let removed;
    await act(async () => {
      removed = await result.current.removeBookmark('comic-101');
    });

    expect(bookmarksActions.removeBookmark).toHaveBeenCalledWith('comic-101');
    expect(removed).toBe(false);
  });

  it('throws error when server action fails', async () => {
    vi.mocked(readerHubService.getBookmarks).mockResolvedValue([]);
    vi.mocked(bookmarksActions.toggleBookmark).mockResolvedValue({
      success: false,
      error: 'Toggle failed',
    });

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.toggleBookmark('comic-101');
      })
    ).rejects.toThrow('Toggle failed');
  });
});
