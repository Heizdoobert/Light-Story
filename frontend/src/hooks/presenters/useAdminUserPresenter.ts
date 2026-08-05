"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminService from '@/services/admin/admin.service';
import * as adminUserActions from '@/actions/admin-users.actions';

export function useAdminUserPresenter(canAccess: boolean) {
  const queryClient = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    enabled: canAccess,
    queryFn: () => adminService.fetchProfiles(),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminUserActions.updateUserRole({ id, role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const nameMutation = useMutation({
    mutationFn: ({ id, full_name }: { id: string; full_name: string | null }) =>
      adminUserActions.updateProfileName({ id, full_name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      adminUserActions.deleteUser({ id, email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; fullName?: string | null; role?: string }) =>
      adminUserActions.createUser(payload),
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
