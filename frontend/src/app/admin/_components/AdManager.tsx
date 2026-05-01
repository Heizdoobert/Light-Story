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

type AdConfigKey = 'ad_header' | 'ad_middle' | 'ad_sidebar';
type AdConfigs = Record<AdConfigKey, string>;

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

export const AdManager: React.FC = () => {
  const { role } = useAuth();
  const canManageAds = role === 'superadmin' || role === 'admin';
  const [configs, setConfigs] = useState<AdConfigs>(DEFAULT_CONFIGS);

  // Fetch settings via presenter hook
  const { data } = useAdConfigsQuery();

  useEffect(() => {
    if (data) {
      const nextConfigs: AdConfigs = { ...DEFAULT_CONFIGS };
      data.forEach((item) => {
        if (item.key in nextConfigs) {
          nextConfigs[item.key as AdConfigKey] = item.value ?? '';
        }
      });
      setConfigs(nextConfigs);
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
    </div>
  );
};

