"use client";

import { useState } from 'react';

export interface Settings {
  mode: 'light' | 'dark' | 'system';
  themeColor: string;
  navCollapsed: boolean;
  layout: 'vertical' | 'horizontal';
  contentWidth: 'full' | 'boxed';
}

const defaultSettings: Settings = {
  mode: 'dark',
  themeColor: '#6366f1',
  navCollapsed: false,
  layout: 'vertical',
  contentWidth: 'full',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('app_settings');
        return stored ? JSON.parse(stored) : defaultSettings;
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_settings', JSON.stringify(updated));
      }
      return updated;
    });
  };

  return { settings, updateSettings };
}
