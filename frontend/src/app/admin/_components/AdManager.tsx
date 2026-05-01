/*
  AdManager.tsx
  Form for managing ad scripts and site settings.
*/
import React, { useState, useEffect } from 'react';
import { useAdConfigsQuery, useUpdateAdConfig } from '@/app/_presenters/useAdManagerPresenter';
import { useAuth } from '@/modules/auth/AuthContext';
import { Save, Info, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';
import { AD_CONTROL_KEYS } from '@/lib/adPolicy';

type AdConfigKey = 'ad_header' | 'ad_middle' | 'ad_sidebar';
type AdConfigs = Record<AdConfigKey, string>;
type RuntimeControlKey =
  | typeof AD_CONTROL_KEYS.enabled
  | typeof AD_CONTROL_KEYS.minHeight
  | typeof AD_CONTROL_KEYS.refreshSeconds
  | typeof AD_CONTROL_KEYS.allowedHosts
  | typeof AD_CONTROL_KEYS.blockedTerms;

type RuntimeControls = {
  enabled: boolean;
  minHeight: string;
  refreshSeconds: string;
  allowedHosts: string;
  blockedTerms: string;
};

const AD_SLOTS: ReadonlyArray<{ id: AdConfigKey; label: string; desc: string }> = [
  { id: 'ad_header', label: 'Header Banner Slot', desc: 'Displayed at the very top of the reader page.' },
  { id: 'ad_middle', label: 'In-Content Slot', desc: 'Injected between paragraphs in the story content.' },
  { id: 'ad_sidebar', label: 'Sidebar Sticky Slot', desc: 'Floats on the right side of the desktop view.' },
];

const DEFAULT_CONFIGS: AdConfigs = {
  ad_header: '',
  ad_middle: '',
  ad_sidebar: '',
};

const DEFAULT_CONTROLS: RuntimeControls = {
  enabled: true,
  minHeight: '120',
  refreshSeconds: '120',
  allowedHosts: 'pagead2.googlesyndication.com',
  blockedTerms: 'adult, xxx, porn, casino, betting, violence, hate',
};

const normalizeToString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

export const AdManager: React.FC = () => {
  const { role } = useAuth();
  const canManageAds = role === 'superadmin' || role === 'admin';
  const [configs, setConfigs] = useState<AdConfigs>(DEFAULT_CONFIGS);
  const [controls, setControls] = useState<RuntimeControls>(DEFAULT_CONTROLS);

  // Fetch settings via presenter hook
  const { data } = useAdConfigsQuery();

  useEffect(() => {
    if (data) {
      const nextConfigs: AdConfigs = { ...DEFAULT_CONFIGS };
      const nextControls: RuntimeControls = { ...DEFAULT_CONTROLS };

      data.forEach((item: { key: string; value: unknown }) => {
        if (item.key in nextConfigs) {
          nextConfigs[item.key as AdConfigKey] = normalizeToString(item.value);
        }

        if (item.key === AD_CONTROL_KEYS.enabled) {
          nextControls.enabled = String(item.value).toLowerCase() !== 'false';
        }
        if (item.key === AD_CONTROL_KEYS.minHeight) {
          nextControls.minHeight = normalizeToString(item.value) || DEFAULT_CONTROLS.minHeight;
        }
        if (item.key === AD_CONTROL_KEYS.refreshSeconds) {
          nextControls.refreshSeconds = normalizeToString(item.value) || DEFAULT_CONTROLS.refreshSeconds;
        }
        if (item.key === AD_CONTROL_KEYS.allowedHosts) {
          nextControls.allowedHosts = normalizeToString(item.value) || DEFAULT_CONTROLS.allowedHosts;
        }
        if (item.key === AD_CONTROL_KEYS.blockedTerms) {
          nextControls.blockedTerms = normalizeToString(item.value) || DEFAULT_CONTROLS.blockedTerms;
        }
      });

      setConfigs(nextConfigs);
      setControls(nextControls);
    }
  }, [data]);

  // Mutation via presenter hook
  const mutation = useUpdateAdConfig();

  const handleSave = (key: AdConfigKey) => {
    const toastId = startDbChangeToast(`Saving ${key} configuration...`);
    mutation.mutate(
      { key, value: configs[key] },
      {
        onSuccess: () => resolveDbChangeToast(toastId, `${key} saved successfully`),
        onError: (error: any) => rejectDbChangeToast(toastId, error, 'update_settings'),
      }
    );
  };

  const handleSaveControl = (key: RuntimeControlKey, value: unknown) => {
    const toastId = startDbChangeToast(`Saving ${key}...`);
    mutation.mutate(
      { key, value },
      {
        onSuccess: () => resolveDbChangeToast(toastId, `${key} saved successfully`),
        onError: (error: unknown) => rejectDbChangeToast(toastId, error, 'update_settings'),
      },
    );
  };

  // Render UI
  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Ad Script Manager</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Inject monetization scripts into specific slots across the platform.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {AD_SLOTS.map((ad) => (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="p-2 bg-primary text-white rounded-lg h-fit">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">{ad.label}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">{ad.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleSave(ad.id)}
                disabled={mutation.isPending || !canManageAds}
                className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>

            <div className="relative">
              <textarea
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-5 font-mono text-[12px] h-40 resize-none focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner text-slate-900 dark:text-slate-200"
                value={configs[ad.id]}
                onChange={(e) => setConfigs((prev) => ({ ...prev, [ad.id]: e.target.value }))}
                placeholder="<!-- Paste your HTML/JS script here -->"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                <AlertCircle size={12} />
                HTML/JS Supported
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5 transition-colors">
        <header className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Runtime Controls</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dynamic controls are read by the reader SPA without redeploy.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ads enabled</span>
            <input
              type="checkbox"
              checked={controls.enabled}
              onChange={(e) => setControls((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Min ad height (px)</label>
            <input
              value={controls.minHeight}
              onChange={(e) => setControls((prev) => ({ ...prev, minHeight: e.target.value }))}
              className="mt-2 w-full bg-transparent outline-none text-slate-900 dark:text-slate-100"
              placeholder="120"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Refresh interval (seconds)</label>
            <input
              value={controls.refreshSeconds}
              onChange={(e) => setControls((prev) => ({ ...prev, refreshSeconds: e.target.value }))}
              className="mt-2 w-full bg-transparent outline-none text-slate-900 dark:text-slate-100"
              placeholder="120"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Allowed script hosts (comma separated)</label>
            <input
              value={controls.allowedHosts}
              onChange={(e) => setControls((prev) => ({ ...prev, allowedHosts: e.target.value }))}
              className="mt-2 w-full bg-transparent outline-none text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Blocked terms (comma separated)</label>
            <input
              value={controls.blockedTerms}
              onChange={(e) => setControls((prev) => ({ ...prev, blockedTerms: e.target.value }))}
              className="mt-2 w-full bg-transparent outline-none text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSaveControl(AD_CONTROL_KEYS.enabled, controls.enabled)}
            disabled={mutation.isPending || !canManageAds}
            className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            Save Enabled
          </button>
          <button
            onClick={() => handleSaveControl(AD_CONTROL_KEYS.minHeight, controls.minHeight)}
            disabled={mutation.isPending || !canManageAds}
            className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            Save Height
          </button>
          <button
            onClick={() => handleSaveControl(AD_CONTROL_KEYS.refreshSeconds, controls.refreshSeconds)}
            disabled={mutation.isPending || !canManageAds}
            className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            Save Refresh
          </button>
          <button
            onClick={() => handleSaveControl(AD_CONTROL_KEYS.allowedHosts, controls.allowedHosts)}
            disabled={mutation.isPending || !canManageAds}
            className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            Save Hosts
          </button>
          <button
            onClick={() => handleSaveControl(AD_CONTROL_KEYS.blockedTerms, controls.blockedTerms)}
            disabled={mutation.isPending || !canManageAds}
            className="flex items-center gap-2 bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-cyan-300 transition-all disabled:opacity-50"
          >
            <Save size={14} />
            Save Terms
          </button>
        </div>
      </section>
    </div>
  );
};

