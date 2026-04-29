"use client";
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';

export function useAuditLogsPresenter() {
  const logsQuery = useQuery({
    queryKey: ['admin_audit_logs'],
    refetchInterval: 10_000,
    queryFn: () => adminService.getAuditLogs(),
  });

  const actorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of logsQuery.data ?? []) {
      if (row.actor_user_id) ids.add(row.actor_user_id);
    }
    return Array.from(ids);
  }, [logsQuery.data]);

  const actorsQuery = useQuery({
    queryKey: ['admin_audit_log_actors', actorIds],
    enabled: actorIds.length > 0,
    queryFn: () => adminService.getProfilesByIds(actorIds),
  });

  const actorMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of actorsQuery.data ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [actorsQuery.data]);

  const isLoading = logsQuery.isLoading || actorsQuery.isLoading;

  return { logsQuery, actorsQuery, actorMap, isLoading };
}
