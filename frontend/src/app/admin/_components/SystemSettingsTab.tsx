import React, { useState } from 'react';
import { Clock3, Globe } from 'lucide-react';
import { useSystemSettingsPresenter } from '@/hooks/useSystemSettingsPresenter';
import { useLanguage } from '@/modules/language/LanguageContext';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

export const SystemSettingsTab: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [purging, setPurging] = useState(false);

  const handlePurgeR2 = async (prefix: string) => {
    const confirmed = window.confirm(
      prefix
        ? `Are you sure you want to purge all R2 objects under '${prefix}'?`
        : 'Are you sure you want to purge ALL R2 objects in the bucket?'
    );
    if (!confirmed) return;
    setPurging(true);
    try {
      const res = await apiClient.post<any>('/api/admin/r2/cleanup', { prefix });
      const count = res?.deletedCount ?? res?.data?.deletedCount ?? 0;
      toast.success(`Successfully purged ${count} objects from R2 storage.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to purge R2 storage.');
    } finally {
      setPurging(false);
    }
  };

  const {
    role,
    settingsQuery,
    compactMode,
    setCompactMode,
    showSyncBadge,
    setShowSyncBadge,
    visibility,
    menuVisibility,
    backupJson,
    setBackupJson,
    systemLogs,
    saveMutation,
    toggleRoleTab,
    toggleMenuTab,
    restoreBackup,
    copyBackup,
    downloadBackup,
    roleTargets,
    dashTabs,
    adminMenuIds,
    adminMenuLabels,
  } = useSystemSettingsPresenter();

  if (role !== 'superadmin' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Restricted Access</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm">Only admin and superadmin can edit system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("system_settings")}</h1>
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{t("interface_controls")}</h3>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                <p className="text-sm font-black text-slate-900 dark:text-white">{t("language")}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select application interface language.</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLanguage("VI")}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                    language === "VI"
                      ? "bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 border-slate-900 dark:border-cyan-400"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  🇻🇳 VI (Tiếng Việt)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("EN")}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                    language === "EN"
                      ? "bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 border-slate-900 dark:border-cyan-400"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  🇺🇸 EN (English)
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{t("compact_layout")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reduces spacing in dashboard cards.</p>
              </div>
              <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className="h-4 w-4" />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{t("show_sync_badge")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Displays live polling status text in dashboard header.</p>
              </div>
              <input type="checkbox" checked={showSyncBadge} onChange={(e) => setShowSyncBadge(e.target.checked)} className="h-4 w-4" />
            </label>

            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 py-3 font-bold disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : t("save_settings")}
            </button>
          </section>

          <section className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Tab Visibility For Lower Roles</h3>

            {roleTargets.map((targetRole) => (
              <div key={targetRole} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm font-black uppercase text-slate-900 dark:text-white mb-3">{targetRole}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dashTabs.map((tabId) => (
                    <label key={tabId} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={visibility[targetRole].includes(tabId)} onChange={() => toggleRoleTab(targetRole, tabId)} />
                      <span>{tabId}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Sidebar Menu Visibility</h4>
              {(['admin', 'employee'] as Array<keyof typeof menuVisibility>).map((targetRole) => (
                <div key={targetRole} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm font-black uppercase text-slate-900 dark:text-white mb-3">{targetRole}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adminMenuIds.map((menuId) => (
                      <label key={menuId} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={menuVisibility[targetRole].includes(menuId)} onChange={() => toggleMenuTab(targetRole, menuId)} />
                        <span>{adminMenuLabels[menuId]}</span>
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
                  <button type="button" onClick={copyBackup} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-black">
                    Copy Snapshot
                  </button>
                  <button type="button" onClick={downloadBackup} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-black">
                    Download Snapshot
                  </button>
                  <button type="button" onClick={restoreBackup} className="rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-3 text-sm font-black">
                    Restore From JSON
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">This backup captures the system settings managed in the UI. Save changes after restore to persist them in Supabase.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Cloudflare R2 Object Maintenance</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage and purge old test files, temporary uploads, or orphaned data from Cloudflare R2 storage.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={purging}
                  onClick={() => handlePurgeR2('uploads/')}
                  className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 px-4 py-2.5 text-xs font-black hover:bg-amber-100 transition-all disabled:opacity-50"
                >
                  {purging ? 'Purging...' : 'Purge Temporary Uploads (uploads/)'}
                </button>
                <button
                  type="button"
                  disabled={purging}
                  onClick={() => handlePurgeR2('')}
                  className="rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 px-4 py-2.5 text-xs font-black hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  {purging ? 'Purging...' : 'Purge All Old Test Objects (All)'}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">System Logs</h4>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div>
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
