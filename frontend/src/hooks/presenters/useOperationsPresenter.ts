import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminService from '@/services/admin/admin.service';
import { fetchStories } from '@/services/comics/story.service';
import * as opsActions from '@/actions/ops.actions';

export function useOperationsPresenter() {
  const queryClient = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ['operations-center-stories'],
    queryFn: () => fetchStories(),
  });

  const profileCountQuery = useQuery({
    queryKey: ['operations-center-profile-count'],
    queryFn: () => adminService.getProfileCount(),
  });

  const chapterCountQuery = useQuery({
    queryKey: ['operations-center-chapter-count'],
    queryFn: () => adminService.getChapterCount(),
  });

  const adSettingsQuery = useQuery({
    queryKey: ['operations-center-ad-settings'],
    queryFn: () => adminService.getAdSettingsCount(),
  });

  const roleDistributionQuery = useQuery({
    queryKey: ['operations-center-role-distribution'],
    queryFn: () => adminService.getRoleDistribution(),
  });

  const maintenanceModeMutation = useMutation({
    mutationFn: (input: { enabled: boolean }) => opsActions.setMaintenanceMode(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: (input?: { target?: string }) => opsActions.clearCache(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
    },
  });

  const triggerBackupMutation = useMutation({
    mutationFn: (input?: { type?: string }) => opsActions.triggerBackup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
    },
  });

  return {
    storiesQuery,
    profileCountQuery,
    chapterCountQuery,
    adSettingsQuery,
    roleDistributionQuery,
    maintenanceModeMutation,
    clearCacheMutation,
    triggerBackupMutation,
    setMaintenanceMode: opsActions.setMaintenanceMode,
    clearCache: opsActions.clearCache,
    triggerBackup: opsActions.triggerBackup,
  };
}

