import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationsPresenter } from '@/hooks/presenters/useOperationsPresenter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as opsActions from '@/actions/ops.actions';

vi.mock('@/actions/ops.actions', () => ({
  setMaintenanceMode: vi.fn(async () => ({ success: true })),
  maintenanceMode: vi.fn(async () => ({ success: true })),
  clearCache: vi.fn(async () => ({ success: true })),
  triggerBackup: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/services/admin/admin.service', () => ({
  getProfileCount: vi.fn(async () => 10),
  getChapterCount: vi.fn(async () => 20),
  getAdSettingsCount: vi.fn(async () => 5),
  getRoleDistribution: vi.fn(async () => [{ role: 'admin', total: 2 }]),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStories: vi.fn(async () => []),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useOperationsPresenter', () => {
  it('returns query states and mutation handlers', async () => {
    const { result } = renderHook(() => useOperationsPresenter(), {
      wrapper: createWrapper(),
    });

    expect(result.current.storiesQuery).toBeDefined();
    expect(result.current.profileCountQuery).toBeDefined();
    expect(result.current.chapterCountQuery).toBeDefined();
    expect(result.current.adSettingsQuery).toBeDefined();
    expect(result.current.roleDistributionQuery).toBeDefined();

    expect(result.current.maintenanceModeMutation).toBeDefined();
    expect(result.current.clearCacheMutation).toBeDefined();
    expect(result.current.triggerBackupMutation).toBeDefined();

    await act(async () => {
      await result.current.maintenanceModeMutation.mutateAsync({ enabled: true });
    });
    expect(opsActions.setMaintenanceMode).toHaveBeenCalledWith({ enabled: true });

    await act(async () => {
      await result.current.clearCacheMutation.mutateAsync({ target: 'cdn' });
    });
    expect(opsActions.clearCache).toHaveBeenCalledWith({ target: 'cdn' });

    await act(async () => {
      await result.current.triggerBackupMutation.mutateAsync({ type: 'db' });
    });
    expect(opsActions.triggerBackup).toHaveBeenCalledWith({ type: 'db' });
  });
});
