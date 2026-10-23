'use client';

import React from 'react';
import { ConfigProvider, ThemeConfig } from 'antd';
import { getThemeConfig } from './theme-config';

export interface LightStoryThemeProviderProps {
  children: React.ReactNode;
  mode?: 'light' | 'dark';
  customTheme?: ThemeConfig;
}

/**
 * LightStoryThemeProvider wraps Ant Design's ConfigProvider with Light-Story's
 * branded theme tokens and algorithms.
 */
export function LightStoryThemeProvider({
  children,
  mode = 'dark',
  customTheme,
}: LightStoryThemeProviderProps) {
  const baseConfig = getThemeConfig(mode);
  const mergedTheme: ThemeConfig = {
    ...baseConfig,
    ...customTheme,
    token: {
      ...baseConfig.token,
      ...customTheme?.token,
    },
    components: {
      ...baseConfig.components,
      ...customTheme?.components,
    },
  };

  return <ConfigProvider theme={mergedTheme}>{children}</ConfigProvider>;
}

export default LightStoryThemeProvider;
