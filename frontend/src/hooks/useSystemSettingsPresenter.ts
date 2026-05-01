import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/AuthContext';
import { getErrorMessage } from '@/lib/errorUtils';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';
import { ADMIN_MENU_IDS, ADMIN_MENU_LABELS } from '@/lib/adminNavigation';
import {
  DASHBOARD_CONFIGURABLE_TABS,
  DashboardTabVisibility,
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  SidebarMenuVisibility,
  getRoleVisibleTabs,
} from '@/lib/systemSettings';
import { fetchSystemSettingsSnapshot, saveSystemSettingsSnapshot } from '@/services/systemSettings.service';
import { SystemSettingsSnapshotDto } from '@/types/dto';

type SystemLogEntry = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

const SYSTEM_LOGS_STORAGE_KEY = 'light-story:system-settings-logs';
const SYSTEM_LOGS_LIMIT = 40;

const readStoredSystemLogs = (): SystemLogEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SYSTEM_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? crypto.randomUUID()),
          action: String(row.action ?? 'Unknown action'),
          detail: String(row.detail ?? ''),
          createdAt: String(row.createdAt ?? new Date().toISOString()),
        };
      });
  } catch {
    return [];
  }
};

const writeStoredSystemLogs = (next: SystemLogEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYSTEM_LOGS_STORAGE_KEY, JSON.stringify(next));
};

const buildBackupJson = (snapshot: SystemSettingsSnapshotDto) =>
  JSON.stringify(snapshot, null, 2);

export const useSystemSettingsPresenter = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [compactMode, setCompactMode] = useState(false);
  const [showSyncBadge, setShowSyncBadge] = useState(true);
  const [visibility, setVisibility] = useState<DashboardTabVisibility>(DEFAULT_DASHBOARD_TAB_VISIBILITY);
  const [menuVisibility, setMenuVisibility] = useState<SidebarMenuVisibility>(DEFAULT_SIDEBAR_MENU_VISIBILITY);
  const [backupJson, setBackupJson] = useState('');
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);

  const settingsQuery = useQuery({
    queryKey: ['site_settings', 'system_settings_tab_rows'],
    queryFn: fetchSystemSettingsSnapshot,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;

    setCompactMode(settingsQuery.data.compactMode);
    setShowSyncBadge(settingsQuery.data.showSyncBadge);
    setVisibility(settingsQuery.data.dashboardTabVisibility);
    setMenuVisibility(settingsQuery.data.sidebarMenuVisibility);
  }, [settingsQuery.data]);

  useEffect(() => {
    setSystemLogs(readStoredSystemLogs());
  }, []);

  const appendSystemLog = (action: string, detail: string) => {
    setSystemLogs((prev) => {
      const next: SystemLogEntry[] = [
        {
          id: crypto.randomUUID(),
          action,
          detail,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, SYSTEM_LOGS_LIMIT);

      writeStoredSystemLogs(next);
      return next;
    });
  };

  useEffect(() => {
    setBackupJson(
      buildBackupJson({
        compactMode,
        showSyncBadge,
        dashboardTabVisibility: visibility,
        sidebarMenuVisibility: menuVisibility,
      }),
    );
  }, [compactMode, showSyncBadge, visibility, menuVisibility]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveSystemSettingsSnapshot({
        compactMode,
        showSyncBadge,
        dashboardTabVisibility: visibility,
        sidebarMenuVisibility: menuVisibility,
      });
    },
    onMutate: () => {
      const toastId = startDbChangeToast('Saving system settings...');
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      resolveDbChangeToast(context?.toastId, 'System settings saved successfully');
      appendSystemLog('Save settings', 'Persisted interface, tab visibility, and sidebar visibility settings.');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'update_settings');
    },
  });

  const toggleRoleTab = (targetRole: keyof DashboardTabVisibility, tabId: string) => {
    setVisibility((prev) => {
      const current = getRoleVisibleTabs(prev, targetRole);
      const exists = current.includes(tabId as any);
      const nextTabs = exists ? current.filter((item) => item !== tabId) : [...current, tabId as any];
      return {
        ...prev,
        [targetRole]: nextTabs,
      };
    });
  };

  const toggleMenuTab = (targetRole: keyof SidebarMenuVisibility, menuId: string) => {
    setMenuVisibility((prev) => {
      const current = prev[targetRole] ?? [];
      const exists = current.includes(menuId as any);
      const nextTabs = exists ? current.filter((item) => item !== menuId) : [...current, menuId as any];
      return {
        ...prev,
        [targetRole]: nextTabs,
      };
    });
  };

  const restoreBackup = async () => {
    try {
      const parsed = JSON.parse(backupJson);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid backup payload');
      }

      if (typeof parsed.compactMode === 'boolean') setCompactMode(parsed.compactMode);
      if (typeof parsed.showSyncBadge === 'boolean') setShowSyncBadge(parsed.showSyncBadge);
      if (parsed.dashboardTabVisibility) setVisibility(parsed.dashboardTabVisibility);
      if (parsed.sidebarMenuVisibility) setMenuVisibility(parsed.sidebarMenuVisibility);

      toast.success('Backup snapshot loaded. Save settings to persist the changes.');
      appendSystemLog('Restore backup snapshot', 'Loaded settings from JSON editor into current UI state.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'update_settings'));
    }
  };

  const copyBackup = async () => {
    try {
      await navigator.clipboard.writeText(backupJson);
      toast.success('Backup snapshot copied to clipboard');
      appendSystemLog('Copy backup snapshot', 'Copied current settings JSON snapshot to clipboard.');
    } catch {
      toast.error('Unable to copy backup snapshot');
    }
  };

  const downloadBackup = () => {
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'light-story-system-settings-backup.json';
    anchor.click();
    window.URL.revokeObjectURL(url);
    appendSystemLog('Download backup snapshot', 'Downloaded settings backup JSON file.');
  };

  return {
    role,
    settingsQuery,
    compactMode,
    setCompactMode,
    showSyncBadge,
    setShowSyncBadge,
    visibility,
    setVisibility,
    menuVisibility,
    setMenuVisibility,
    backupJson,
    setBackupJson,
    systemLogs,
    saveMutation,
    toggleRoleTab,
    toggleMenuTab,
    restoreBackup,
    copyBackup,
    downloadBackup,
    roleTargets: ['admin', 'employee', 'user'] as Array<keyof DashboardTabVisibility>,
    dashTabs: DASHBOARD_CONFIGURABLE_TABS,
    adminMenuIds: ADMIN_MENU_IDS,
    adminMenuLabels: ADMIN_MENU_LABELS,
  };
};
