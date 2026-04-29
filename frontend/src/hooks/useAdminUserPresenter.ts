"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';

export function useAdminUserPresenter(canAccess: boolean) {
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    enabled: canAccess,
    queryFn: () => adminService.fetchProfiles(),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminService.updateProfileRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const nameMutation = useMutation({
    mutationFn: ({ id, full_name }: { id: string; full_name: string | null }) =>
      adminService.updateProfileName(id, full_name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      adminService.callManageUserFunction({ action: 'delete', userId: id, targetEmail: email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; fullName?: string | null; role?: string }) =>
      adminService.callManageUserFunction({ action: 'create', ...payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  return {
    profilesQuery,
    roleMutation,
    nameMutation,
    deleteMutation,
    createMutation,
  };
}
