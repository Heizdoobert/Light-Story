import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROUTES } from '@/lib/constants/routes';
import { apiClient } from '@/lib/api/apiClient';
import { useAdminDashboardPresenter } from '../useAdminDashboardPresenter';
import { useUserDashboardPresenter } from '../useUserDashboardPresenter';
import * as storyService from '@/services/comics/story.service';
import * as readerHooks from '@/hooks/features/useReadingHistory';
import * as userHooks from '@/hooks/features/use-user';

// Mock dependencies
vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/hooks/common/use-role-guard', () => ({
  useRoleGuard: vi.fn(),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesPage: vi.fn(),
}));

vi.mock('@/hooks/features/useReadingHistory', () => ({
  useReadingHistory: vi.fn(),
}));

vi.mock('@/hooks/features/use-user', () => ({
  useUser: vi.fn(),
}));

describe('Dashboard Presenters Unit Tests', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const QueryWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    QueryWrapper.displayName = 'QueryWrapper';
    return QueryWrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(userHooks.useUser).mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' } as any,
      profile: null,
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      isStaff: false,
      role: 'user',
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(readerHooks.useReadingHistory).mockReturnValue({
      history: [],
      isLoading: false,
      recordHistory: vi.fn(),
      clearHistory: vi.fn(),
    } as any);

    vi.mocked(storyService.fetchStoriesPage).mockResolvedValue({
      items: [
        { id: 'story-1', title: 'Truyện Hay 1' } as any,
        { id: 'story-2', title: 'Truyện Hay 2' } as any,
      ],
      total: 2,
    });
  });

  describe('useAdminDashboardPresenter', () => {
    it('initializes with default timeRange and loads admin overview data', async () => {
      const mockOverview = {
        stats: {
          totalStories: 100,
          totalChapters: 500,
          activeStories: 80,
          totalViews: 250000,
        },
        engagement: {
          mau: 12000,
          new_signups: 450,
          dau: 2100,
        },
        infrastructure: {
          r2_usage_gb: 15.2,
          r2_allocated_gb: 50,
        },
        stories: [],
        recentSettingsChanges: [
          {
            id: 'c1',
            action: 'UPDATE',
            actor_email: 'su***n@domain.com',
            actor_name: null,
            metadata: { keys: ['site_title'] },
            created_at: '2026-11-05T00:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockOverview);

      const { result } = renderHook(() => useAdminDashboardPresenter(), {
        wrapper: createWrapper(),
      });

      expect(result.current.timeRange).toBe('30d');
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        ROUTES.API.ADMIN.ANALYTICS_DASHBOARD,
        expect.any(Object)
      );
      expect(result.current.data.stats?.totalStories).toBe(100);
      expect(result.current.data.recentSettingsChanges[0].actor_email).toBe('su***n@domain.com');

      // Test changing timeRange
      act(() => {
        result.current.setTimeRange('7d');
      });
      expect(result.current.timeRange).toBe('7d');
    });

    it('handles fetch errors gracefully without unhandled crashes', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAdminDashboardPresenter(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data.stats).toBeNull();
    });
  });

  describe('useUserDashboardPresenter', () => {
    it('loads user reading progress with calculated progress percentages', async () => {
      const mockHistoryRows = [
        {
          story_id: 's-10',
          story_title: 'Đại Quản Gia Là Ma Hoàng',
          chapter_id: 'chap-50',
          chapter_number: 50,
          total_chapters: 100,
          progress_percent: 50,
          updated_at: '2026-11-05T02:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockHistoryRows);

      const { result } = renderHook(() => useUserDashboardPresenter(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.readingList.length).toBe(1);
      });

      const item = result.current.readingList[0];
      expect(item.storyId).toBe('s-10');
      expect(item.title).toBe('Đại Quản Gia Là Ma Hoàng');
      expect(item.currentChapterNumber).toBe(50);
      expect(item.totalChapters).toBe(100);
      expect(item.progressPercent).toBe(50);

      // Check recommendations
      await waitFor(() => {
        expect(result.current.recommended.length).toBe(2);
      });
      expect(result.current.recommended[0].title).toBe('Truyện Hay 1');
    });

    it('falls back to local reading history if API endpoint is empty or offline', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Offline'));
      vi.mocked(readerHooks.useReadingHistory).mockReturnValue({
        history: [
          {
            comicId: 'local-comic-1',
            chapterNumber: 5,
            chapterId: 'local-chap-5',
            updatedAt: '2026-11-05T00:00:00Z',
          },
        ] as any,
        isLoading: false,
        recordHistory: vi.fn(),
        clearHistory: vi.fn(),
      } as any);

      const { result } = renderHook(() => useUserDashboardPresenter(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.readingList.length).toBe(1);
      });

      expect(result.current.readingList[0].storyId).toBe('local-comic-1');
      expect(result.current.readingList[0].currentChapterNumber).toBe(5);
    });
  });
});
