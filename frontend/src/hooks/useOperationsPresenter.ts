import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';
import { SupabaseStoryRepository } from '@/services/repositories/SupabaseStoryRepository';

const storyRepo = new SupabaseStoryRepository();

export function useOperationsPresenter() {
  const storiesQuery = useQuery({
    queryKey: ['operations-center-stories'],
    queryFn: () => storyRepo.getStories(),
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

  return { storiesQuery, profileCountQuery, chapterCountQuery, adSettingsQuery, roleDistributionQuery };
}
