// System settings tab for UI controls and role-based dashboard tab visibility.
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';
import { Clock3 } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { getErrorMessage } from '../lib/errorUtils';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../lib/dbChangeToast';
import { ADMIN_MENU_IDS, ADMIN_MENU_LABELS } from '../lib/adminNavigation';
import {
  DASHBOARD_CONFIGURABLE_TABS,
  DashboardTabVisibility,
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  SidebarMenuVisibility,
  getRoleVisibleTabs,
  parseBooleanSetting,
  parseDashboardTabVisibility,
  parseSidebarMenuVisibility,
  SITE_SETTING_KEYS,
} from '../lib/systemSettings';

type SiteSettingRow = {
  key: string;
  value: unknown;
};

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

const toSettingRows = (input: unknown): SiteSettingRow[] => {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === 'object' && 'key' in item)
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        key: String(row.key ?? ''),
        value: row.value,
      };
    })
    .filter((row) => row.key.length > 0);
};

export const SystemSettingsTab: React.FC = () => {
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
    queryFn: async () => {
      if (!supabase) return [] as SiteSettingRow[];

      const { data, error } = await supabase
        .from('site_settings')
        .select('key,value')
        .in('key', [
          SITE_SETTING_KEYS.uiCompactMode,
          SITE_SETTING_KEYS.uiShowSyncBadge,
          SITE_SETTING_KEYS.dashboardTabVisibility,
          SITE_SETTING_KEYS.sidebarMenuVisibility,
        ]);

      if (error) {
        return [] as SiteSettingRow[];
      }

      return toSettingRows(data);
    },
  });

  const roleTargets: Array<keyof DashboardTabVisibility> = ['admin', 'employee', 'user'];

  useEffect(() => {
    const rows = toSettingRows(settingsQuery.data);
    const map = new Map(rows.map((item) => [item.key, item.value]));

    setCompactMode(parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiCompactMode), false));
    setShowSyncBadge(parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiShowSyncBadge), true));
    setVisibility(parseDashboardTabVisibility(map.get(SITE_SETTING_KEYS.dashboardTabVisibility)));
    setMenuVisibility(parseSidebarMenuVisibility(map.get(SITE_SETTING_KEYS.sidebarMenuVisibility)));
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

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SYSTEM_LOGS_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  };

  useEffect(() => {
    setBackupJson(
      JSON.stringify(
        {
          compactMode,
          showSyncBadge,
          dashboardTabVisibility: visibility,
          sidebarMenuVisibility: menuVisibility,
        },
        null,
        2,
      ),
    );
  }, [compactMode, showSyncBadge, visibility, menuVisibility]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) return;

      const payload = [
        { key: SITE_SETTING_KEYS.uiCompactMode, value: compactMode },
        { key: SITE_SETTING_KEYS.uiShowSyncBadge, value: showSyncBadge },
        { key: SITE_SETTING_KEYS.dashboardTabVisibility, value: visibility },
        { key: SITE_SETTING_KEYS.sidebarMenuVisibility, value: menuVisibility },
      ];

      const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
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

      if (typeof parsed.compactMode === 'boolean') {
        setCompactMode(parsed.compactMode);
      }

      if (typeof parsed.showSyncBadge === 'boolean') {
        setShowSyncBadge(parsed.showSyncBadge);
      }

      if (parsed.dashboardTabVisibility) {
        setVisibility(parseDashboardTabVisibility(parsed.dashboardTabVisibility));
      }

      if (parsed.sidebarMenuVisibility) {
        setMenuVisibility(parseSidebarMenuVisibility(parsed.sidebarMenuVisibility));
      }

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

  if (role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Restricted Access</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm">Only superadmin can edit system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configure interface behavior and role-based dashboard tab visibility.</p>
      </header>

      {settingsQuery.isError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Unable to load saved settings. Using safe defaults.</p>
        </div>
      )}

      {settingsQuery.isLoading && <p className="text-sm font-bold text-slate-500">Loading settings...</p>}

      {!settingsQuery.isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Interface Controls</h3>

            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Compact Dashboard Layout</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reduces spacing in dashboard cards.</p>
              </div>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Show Live Sync Badge</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Displays live polling status text in dashboard header.</p>
              </div>
              <input
                type="checkbox"
                checked={showSyncBadge}
                onChange={(e) => setShowSyncBadge(e.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full rounded-xl bg-slate-900 dark:bg-primary text-white py-3 font-bold disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </section>

          <section className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Tab Visibility For Lower Roles</h3>

            {roleTargets.map((targetRole) => (
                <div key={targetRole} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm font-black uppercase text-slate-900 dark:text-white mb-3">{targetRole}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DASHBOARD_CONFIGURABLE_TABS.map((tabId) => (
                      <label key={tabId} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={getRoleVisibleTabs(visibility, targetRole).includes(tabId)}
                          onChange={() => toggleRoleTab(targetRole, tabId)}
                        />
                        <span>{tabId}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Sidebar Menu Visibility</h4>
              {(['admin', 'employee', 'user'] as Array<keyof SidebarMenuVisibility>).map((targetRole) => (
                <div key={targetRole} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm font-black uppercase text-slate-900 dark:text-white mb-3">{targetRole}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ADMIN_MENU_IDS.map((menuId) => (
                      <label key={menuId} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={menuVisibility[targetRole].includes(menuId)}
                          onChange={() => toggleMenuTab(targetRole, menuId)}
                        />
                        <span>{ADMIN_MENU_LABELS[menuId]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Backup & Restore</h4>
              <div className="grid grid-cols-1 gap-3">
                <textarea
                  value={backupJson}
                  onChange={(e) => setBackupJson(e.target.value)}
                  rows={10}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-100"
                  placeholder="System settings backup JSON"
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={copyBackup} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-black">Copy Snapshot</button>
                  <button type="button" onClick={() => {
                    const blob = new Blob([backupJson], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'light-story-system-settings-backup.json';
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                    appendSystemLog('Download backup snapshot', 'Downloaded settings backup JSON file.');
                  }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-black">Download Snapshot</button>
                  <button type="button" onClick={restoreBackup} className="rounded-xl bg-slate-900 dark:bg-primary text-white px-4 py-3 text-sm font-black">Restore From JSON</button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">This backup captures the system settings managed in the UI. Save changes after restore to persist them in Supabase.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">System Logs</h4>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-64 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                  {systemLogs.length === 0 && (
                    <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No system logs yet. Logs will appear after save/backup actions.</div>
                  )}
                  {systemLogs.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{entry.action}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <Clock3 size={12} />
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
