"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/sdk/supabaseClient';
import type { LogEntry } from '@/sdk/logger/types';
import { useRoleGuard } from '@/hooks/common/use-role-guard';
import { ROUTES } from '@/lib/constants/routes';

export const PAGE_SIZE = 50;

export interface SystemLogsPresenterState {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  levelFilter: string;
  serviceFilter: string;
  searchQuery: string;
  selectedLog: LogEntry | null;
  setLevelFilter: (level: string) => void;
  setServiceFilter: (service: string) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setSelectedLog: (log: LogEntry | null) => void;
  refresh: () => Promise<void>;
}

export function useSystemLogsPresenter(): SystemLogsPresenterState {
  useRoleGuard(['superadmin'], ROUTES.ADMIN.DASHBOARD);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase || typeof supabase.from !== 'function') {
        setLogs([]);
        setTotal(0);
        return;
      }

      let query = supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (levelFilter && levelFilter !== 'ALL') {
        query = query.eq('level', levelFilter);
      }

      if (serviceFilter && serviceFilter !== 'ALL') {
        query = query.eq('service', serviceFilter);
      }

      if (searchQuery.trim()) {
        query = query.ilike('message', `%${searchQuery.trim()}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setLogs((data as LogEntry[]) ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, levelFilter, serviceFilter, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    void fetchLogs();
    return () => {
      cancelled = true;
      if (cancelled) {
        // no-op cleanup
      }
    };
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    isLoading,
    error,
    levelFilter,
    serviceFilter,
    searchQuery,
    selectedLog,
    setLevelFilter: (lvl: string) => {
      setLevelFilter(lvl);
      setPage(1);
    },
    setServiceFilter: (svc: string) => {
      setServiceFilter(svc);
      setPage(1);
    },
    setSearchQuery: (q: string) => {
      setSearchQuery(q);
      setPage(1);
    },
    setPage,
    setSelectedLog,
    refresh: fetchLogs,
  };
}
