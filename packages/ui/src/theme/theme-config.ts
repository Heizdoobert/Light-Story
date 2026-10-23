import { theme, ThemeConfig } from 'antd';
import {
  BRAND_COLORS,
  DARK_THEME_COLORS,
  LIGHT_THEME_COLORS,
  DEFAULT_RADIUS,
} from './tokens';

export const lightThemeConfig: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: BRAND_COLORS.primary,
    colorInfo: BRAND_COLORS.info,
    colorSuccess: BRAND_COLORS.success,
    colorWarning: BRAND_COLORS.warning,
    colorError: BRAND_COLORS.error,
    borderRadius: DEFAULT_RADIUS.base,
    borderRadiusLG: DEFAULT_RADIUS.lg,
    borderRadiusSM: DEFAULT_RADIUS.sm,
    fontFamily: "var(--font-geist-sans), 'Plus Jakarta Sans', system-ui, sans-serif",
    colorBgBase: LIGHT_THEME_COLORS.bgBase,
    colorBgContainer: LIGHT_THEME_COLORS.bgContainer,
    colorBgElevated: LIGHT_THEME_COLORS.bgElevated,
    colorBgLayout: LIGHT_THEME_COLORS.bgLayout,
    colorText: LIGHT_THEME_COLORS.text,
    colorTextSecondary: LIGHT_THEME_COLORS.textSecondary,
    colorBorder: LIGHT_THEME_COLORS.border,
    colorBorderSecondary: LIGHT_THEME_COLORS.borderSecondary,
  },
  components: {
    Button: {
      borderRadius: DEFAULT_RADIUS.base,
      controlHeight: 38,
      fontWeight: 600,
    },
    Table: {
      borderRadius: DEFAULT_RADIUS.base,
      headerBg: '#f8fafc',
      headerColor: '#475569',
      rowHoverBg: '#f1f5f9',
    },
    Card: {
      borderRadiusLG: DEFAULT_RADIUS.lg,
    },
    Modal: {
      borderRadiusLG: DEFAULT_RADIUS.lg,
    },
  },
};

export const darkThemeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: BRAND_COLORS.primary,
    colorInfo: BRAND_COLORS.info,
    colorSuccess: BRAND_COLORS.success,
    colorWarning: BRAND_COLORS.warning,
    colorError: BRAND_COLORS.error,
    borderRadius: DEFAULT_RADIUS.base,
    borderRadiusLG: DEFAULT_RADIUS.lg,
    borderRadiusSM: DEFAULT_RADIUS.sm,
    fontFamily: "var(--font-geist-sans), 'Plus Jakarta Sans', system-ui, sans-serif",
    colorBgBase: DARK_THEME_COLORS.bgBase,
    colorBgContainer: DARK_THEME_COLORS.bgContainer,
    colorBgElevated: DARK_THEME_COLORS.bgElevated,
    colorBgLayout: DARK_THEME_COLORS.bgLayout,
    colorText: DARK_THEME_COLORS.text,
    colorTextSecondary: DARK_THEME_COLORS.textSecondary,
    colorBorder: DARK_THEME_COLORS.border,
    colorBorderSecondary: DARK_THEME_COLORS.borderSecondary,
  },
  components: {
    Button: {
      borderRadius: DEFAULT_RADIUS.base,
      controlHeight: 38,
      fontWeight: 600,
    },
    Table: {
      borderRadius: DEFAULT_RADIUS.base,
      headerBg: '#1e293b',
      headerColor: '#cbd5e1',
      rowHoverBg: '#1e293b80',
    },
    Card: {
      borderRadiusLG: DEFAULT_RADIUS.lg,
      colorBgContainer: DARK_THEME_COLORS.bgContainer,
    },
    Modal: {
      borderRadiusLG: DEFAULT_RADIUS.lg,
    },
  },
};

export function getThemeConfig(mode: 'light' | 'dark' = 'dark'): ThemeConfig {
  return mode === 'dark' ? darkThemeConfig : lightThemeConfig;
}
