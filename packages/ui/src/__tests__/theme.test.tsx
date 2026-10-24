import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  BRAND_COLORS,
  getThemeConfig,
  lightThemeConfig,
  darkThemeConfig,
  LightStoryThemeProvider,
} from '../theme';

describe('Theme System', () => {
  it('defines the correct brand colors', () => {
    expect(BRAND_COLORS.primary).toBe('#f97316');
    expect(BRAND_COLORS.success).toBe('#10b981');
    expect(BRAND_COLORS.error).toBe('#ef4444');
    expect(BRAND_COLORS.warning).toBe('#f59e0b');
  });

  it('provides distinct light and dark theme configurations', () => {
    expect(lightThemeConfig.token?.colorPrimary).toBe('#f97316');
    expect(darkThemeConfig.token?.colorPrimary).toBe('#f97316');

    expect(getThemeConfig('light')).toBe(lightThemeConfig);
    expect(getThemeConfig('dark')).toBe(darkThemeConfig);
  });

  it('renders children within LightStoryThemeProvider in light and dark mode', () => {
    const { rerender } = render(
      <LightStoryThemeProvider mode="dark">
        <div data-testid="themed-child">Dark Themed Content</div>
      </LightStoryThemeProvider>
    );

    expect(screen.getByTestId('themed-child')).toHaveTextContent('Dark Themed Content');

    rerender(
      <LightStoryThemeProvider mode="light">
        <div data-testid="themed-child">Light Themed Content</div>
      </LightStoryThemeProvider>
    );

    expect(screen.getByTestId('themed-child')).toHaveTextContent('Light Themed Content');
  });
});
