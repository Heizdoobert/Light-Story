// System settings tab for UI controls and role-based dashboard tab visibility.
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';
import { useAuth } from '../modules/auth/AuthContext';
import { getErrorMessage } from '../lib/errorUtils';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../lib/dbChangeToast';
import {
  DASHBOARD_CONFIGURABLE_TABS,
  DashboardTabVisibility,
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  getRoleVisibleTabs,
  parseBooleanSetting,
  parseDashboardTabVisibility,
  SITE_SETTING_KEYS,
} from '../lib/systemSettings';

type SiteSettingRow = {
  key: string;
  value: unknown;
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
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) return;

      const payload = [
        { key: SITE_SETTING_KEYS.uiCompactMode, value: compactMode },
        { key: SITE_SETTING_KEYS.uiShowSyncBadge, value: showSyncBadge },
        { key: SITE_SETTING_KEYS.dashboardTabVisibility, value: visibility },
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
          </section>
        </div>
      )}
    </div>
  );
};
