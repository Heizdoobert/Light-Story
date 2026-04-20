/*
  AdManager.tsx
  Form for managing ad scripts and site settings.
*/
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';
import { Save, Info, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const AdManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState({
    ad_header: '',
    ad_middle: '',
    ad_sidebar: ''
  });

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ['site_settings'],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('site_settings')
        .select('*')
        .in('key', ['ad_header', 'ad_middle', 'ad_sidebar']);
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (data) {
      const newConfigs = { ...configs };
      data.forEach((item: any) => {
        if (item.key in newConfigs) {
          (newConfigs as any)[item.key] = item.value;
        }
      });
      setConfigs(newConfigs);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase!
        .from('site_settings')
        .upsert({ key, value: (configs as any)[key] }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleSave = (key: string) => {
    mutation.mutate(key);
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-200 rounded-2xl w-full"></div></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Ad Script Manager</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Inject monetization scripts into specific slots across the platform.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {[
          { id: 'ad_header', label: 'Header Banner Slot', desc: 'Displayed at the very top of the reader page.' },
          { id: 'ad_middle', label: 'In-Content Slot', desc: 'Injected between paragraphs in the story content.' },
          { id: 'ad_sidebar', label: 'Sidebar Sticky Slot', desc: 'Floats on the right side of the desktop view.' }
        ].map((ad) => (
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
                disabled={mutation.isPending}
                className="flex items-center gap-2 bg-slate-900 dark:bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>

            <div className="relative">
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-5 font-mono text-[12px] h-40 resize-none focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner text-slate-900 dark:text-slate-200"
                value={(configs as any)[ad.id]}
                onChange={(e) => setConfigs({...configs, [ad.id]: e.target.value})}
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
