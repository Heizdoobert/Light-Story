export const BRAND_COLORS = {
  primary: '#f97316',      // Light-Story Vibrant Orange
  primaryHover: '#ea580c',
  primaryActive: '#c2410c',
  primaryBg: '#fff7ed',
  primaryBgHover: '#ffedd5',
  primaryBorder: '#fed7aa',

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
} as const;

export const DARK_THEME_COLORS = {
  bgBase: '#0b0f17',       // Main dark background
  bgContainer: '#111827',  // Card / Table / Modal container background
  bgElevated: '#1f2937',   // Popover / Dropdown background
  bgLayout: '#070a0f',     // Layout sidebar background
  text: '#f3f4f6',         // Primary text
  textSecondary: '#9ca3af',
  border: '#1f2937',       // Component border
  borderSecondary: '#374151',
} as const;

export const LIGHT_THEME_COLORS = {
  bgBase: '#ffffff',
  bgContainer: '#ffffff',
  bgElevated: '#ffffff',
  bgLayout: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  borderSecondary: '#cbd5e1',
} as const;

export const DEFAULT_RADIUS = {
  base: 8,
  sm: 6,
  lg: 12,
} as const;
