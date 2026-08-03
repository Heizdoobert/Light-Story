/**
 * Master Shared Registry & Central Configuration File
 * Combines all shared routes, API endpoints, menu configurations, design tokens, 
 * theme palettes, formatters, validators, and core utilities into a single file for easy tracking.
 */

import { APP_ROUTES } from './route.config';
import { API_ENDPOINTS } from './api.config';
import { menuItems } from '@/@menu';
import { palette } from '@core/theme/palette';
import { typography } from '@core/theme/typography';
import { breakpoints, shadows } from '@core/theme/breakpoints';
import { formatDate, formatTimeAgo } from '@core/utils/formatDate';
import { formatNumber, formatCurrency, formatCompactNumber } from '@core/utils/formatNumber';
import { isValidEmail, isValidPhoneNumber } from '@/utils/validate';

// 1. Unified Routes & API Registries
export const SHARED_ROUTES = APP_ROUTES;
export const SHARED_APIS = API_ENDPOINTS;
export const SHARED_MENU = menuItems;

// 2. Unified Theme & Design System Tokens
export const SHARED_THEME = {
  palette,
  typography,
  breakpoints,
  shadows,
} as const;

// 3. Unified Formatters & Utility Helpers
export const SHARED_UTILS = {
  formatDate,
  formatTimeAgo,
  formatNumber,
  formatCurrency,
  formatCompactNumber,
  isValidEmail,
  isValidPhoneNumber,
} as const;

// 4. Combined Master Object for Single-File Access
export const SHARED = {
  routes: SHARED_ROUTES,
  apis: SHARED_APIS,
  menu: SHARED_MENU,
  theme: SHARED_THEME,
  utils: SHARED_UTILS,
} as const;

// Re-export everything for direct named imports from a single file
export {
  APP_ROUTES,
  API_ENDPOINTS,
  menuItems,
  palette,
  typography,
  breakpoints,
  shadows,
  formatDate,
  formatTimeAgo,
  formatNumber,
  formatCurrency,
  formatCompactNumber,
  isValidEmail,
  isValidPhoneNumber,
};

export default SHARED;
