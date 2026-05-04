export type AdSlotKey = 'ad_header' | 'ad_middle' | 'ad_sidebar';

export const AD_SLOT_KEYS: readonly AdSlotKey[] = ['ad_header', 'ad_middle', 'ad_sidebar'];

export const AD_CONTROL_KEYS = {
  enabled: 'public_ads_enabled',
  minHeight: 'public_ad_min_height',
  refreshSeconds: 'public_ad_refresh_seconds',
  allowedHosts: 'public_ad_allowed_hosts',
  blockedTerms: 'public_ad_blocked_terms',
} as const;

export const ALLOWED_AD_SETTING_KEYS = [
  ...AD_SLOT_KEYS,
  AD_CONTROL_KEYS.enabled,
  AD_CONTROL_KEYS.minHeight,
  AD_CONTROL_KEYS.refreshSeconds,
  AD_CONTROL_KEYS.allowedHosts,
  AD_CONTROL_KEYS.blockedTerms,
] as const;

const DEFAULT_ALLOWED_HOSTS = ['pagead2.googlesyndication.com'];
const DEFAULT_BLOCKED_TERMS = ['adult', 'xxx', 'porn', 'casino', 'betting', 'violence', 'hate'];
const INVALID_SCRIPT_HOST = '__invalid_script_host__';

const MAX_MARKUP_LENGTH = 20000;
const MIN_CONTAINER_HEIGHT = 90;
const MAX_CONTAINER_HEIGHT = 600;
const MIN_REFRESH_SECONDS = 15;
const MAX_REFRESH_SECONDS = 3600;

export interface AdRuntimeSettings {
  enabled: boolean;
  minHeight: number;
  refreshSeconds: number;
  allowedHosts: string[];
  blockedTerms: string[];
}

export interface AdManagerState {
  configs: Record<AdSlotKey, string>;
  controls: {
    enabled: boolean;
    minHeight: string;
    refreshSeconds: string;
    allowedHosts: string;
    blockedTerms: string;
  };
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeToString = (value: unknown): string => {
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

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const parseBoundedInteger = (value: unknown, fallback: number, min: number, max: number): number => {
  const raw = normalizeToString(value).trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
};

const parseStringList = (value: unknown, fallback: string[]): string[] => {
  if (Array.isArray(value)) {
    const rows = value.map((item) => normalizeToString(item).trim().toLowerCase()).filter(Boolean);
    return rows.length > 0 ? rows : [...fallback];
  }

  const raw = normalizeToString(value).trim();
  if (!raw) return [...fallback];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const rows = parsed.map((item) => normalizeToString(item).trim().toLowerCase()).filter(Boolean);
        return rows.length > 0 ? rows : [...fallback];
      }
    } catch {
      // Ignore invalid JSON and fallback to comma parsing.
    }
  }

  const byComma = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return byComma.length > 0 ? byComma : [...fallback];
};

export const parseAdRuntimeSettings = (settingsMap: Map<string, unknown>): AdRuntimeSettings => {
  return {
    enabled: parseBoolean(settingsMap.get(AD_CONTROL_KEYS.enabled), true),
    minHeight: parseBoundedInteger(
      settingsMap.get(AD_CONTROL_KEYS.minHeight),
      120,
      MIN_CONTAINER_HEIGHT,
      MAX_CONTAINER_HEIGHT,
    ),
    refreshSeconds: parseBoundedInteger(
      settingsMap.get(AD_CONTROL_KEYS.refreshSeconds),
      120,
      MIN_REFRESH_SECONDS,
      MAX_REFRESH_SECONDS,
    ),
    allowedHosts: parseStringList(settingsMap.get(AD_CONTROL_KEYS.allowedHosts), DEFAULT_ALLOWED_HOSTS),
    blockedTerms: parseStringList(settingsMap.get(AD_CONTROL_KEYS.blockedTerms), DEFAULT_BLOCKED_TERMS),
  };
};

const extractScriptHosts = (markup: string): string[] => {
  const scriptHostSet = new Set<string>();
  const scriptSrcRegex = /<script[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptSrcRegex.exec(markup)) !== null) {
    const src = match[1] ?? '';
    if (!src) continue;

    try {
      const parsed = new URL(src, 'https://example.com');
      if (parsed.hostname) {
        scriptHostSet.add(parsed.hostname.toLowerCase());
      }
    } catch {
      scriptHostSet.add(INVALID_SCRIPT_HOST);
    }
  }

  return Array.from(scriptHostSet);
};

const containsBlockedTerm = (input: string, blockedTerms: string[]): boolean => {
  const normalized = input.toLowerCase();
  return blockedTerms.some((term) => term && normalized.includes(term));
};

export const isAllowedAdSettingKey = (value: string): value is (typeof ALLOWED_AD_SETTING_KEYS)[number] =>
  (ALLOWED_AD_SETTING_KEYS as readonly string[]).includes(value);

export function validateAdMarkup(
  markup: string,
  settings: AdRuntimeSettings,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = markup.trim();
  if (!trimmed) return { ok: true };

  if (trimmed.length > MAX_MARKUP_LENGTH) {
    return { ok: false, reason: 'Ad markup exceeds size limit.' };
  }

  if (/<(?:iframe|object|embed)\b/i.test(trimmed)) {
    return { ok: false, reason: 'Blocked ad tag: iframe/object/embed is not allowed.' };
  }

  if (/\bon[a-z]+\s*=/i.test(trimmed)) {
    return { ok: false, reason: 'Inline event handlers are not allowed in ad markup.' };
  }

  if (/javascript\s*:/i.test(trimmed)) {
    return { ok: false, reason: 'javascript: URLs are not allowed in ad markup.' };
  }

  if (containsBlockedTerm(trimmed, settings.blockedTerms)) {
    return { ok: false, reason: 'Ad markup violates blocked terms policy.' };
  }

  const scriptHosts = extractScriptHosts(trimmed);
  if (scriptHosts.includes(INVALID_SCRIPT_HOST)) {
    return { ok: false, reason: 'Script src URL is invalid.' };
  }

  if (scriptHosts.length > 0 && settings.allowedHosts.length > 0) {
    const allowed = new Set(settings.allowedHosts.map((host) => host.toLowerCase()));
    for (const host of scriptHosts) {
      if (!allowed.has(host)) {
        return { ok: false, reason: `Script host not allowed: ${host}` };
      }
    }
  }

  return { ok: true };
}

export const parseSiteSettingsRows = (rows: Array<{ key: string; value: unknown }>) => {
  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  const runtime = parseAdRuntimeSettings(map);
  const slotMarkup: Record<AdSlotKey, string> = {
    ad_header: normalizeToString(map.get('ad_header')),
    ad_middle: normalizeToString(map.get('ad_middle')),
    ad_sidebar: normalizeToString(map.get('ad_sidebar')),
  };

  return { map, runtime, slotMarkup };
};

export const parseAdManagerState = (rows: Array<{ key: string; value: unknown }>): AdManagerState => {
  const { runtime, slotMarkup } = parseSiteSettingsRows(rows);

  return {
    configs: {
      ad_header: slotMarkup.ad_header,
      ad_middle: slotMarkup.ad_middle,
      ad_sidebar: slotMarkup.ad_sidebar,
    },
    controls: {
      enabled: runtime.enabled,
      minHeight: String(runtime.minHeight),
      refreshSeconds: String(runtime.refreshSeconds),
      allowedHosts: runtime.allowedHosts.join(', '),
      blockedTerms: runtime.blockedTerms.join(', '),
    },
  };
};

export const isAdSlotKey = (value: string): value is AdSlotKey =>
  (AD_SLOT_KEYS as readonly string[]).includes(value);

export const sanitizeAdSettingValue = (key: string, value: unknown): unknown => {
  if (key === AD_CONTROL_KEYS.enabled) {
    return parseBoolean(value, true);
  }

  if (key === AD_CONTROL_KEYS.minHeight) {
    return parseBoundedInteger(value, 120, MIN_CONTAINER_HEIGHT, MAX_CONTAINER_HEIGHT);
  }

  if (key === AD_CONTROL_KEYS.refreshSeconds) {
    return parseBoundedInteger(value, 120, MIN_REFRESH_SECONDS, MAX_REFRESH_SECONDS);
  }

  if (key === AD_CONTROL_KEYS.allowedHosts || key === AD_CONTROL_KEYS.blockedTerms) {
    return parseStringList(value, []);
  }

  if (isAdSlotKey(key)) {
    return normalizeToString(value);
  }

  return value;
};

export const buildDefaultAdRows = (): Array<{ key: string; value: unknown }> => [
  { key: AD_CONTROL_KEYS.enabled, value: true },
  { key: AD_CONTROL_KEYS.minHeight, value: 120 },
  { key: AD_CONTROL_KEYS.refreshSeconds, value: 120 },
  { key: AD_CONTROL_KEYS.allowedHosts, value: [...DEFAULT_ALLOWED_HOSTS] },
  { key: AD_CONTROL_KEYS.blockedTerms, value: [...DEFAULT_BLOCKED_TERMS] },
  { key: 'ad_header', value: '' },
  { key: 'ad_middle', value: '' },
  { key: 'ad_sidebar', value: '' },
];

export const toSafeAdRows = (rows: Array<{ key: string; value: unknown }>): Array<{ key: string; value: unknown }> => {
  const { runtime, slotMarkup } = parseSiteSettingsRows(rows);

  const safeRows = rows.map((row) => {
    if (!isAdSlotKey(row.key)) return row;
    const validation = validateAdMarkup(slotMarkup[row.key], runtime);
    if (!validation.ok) {
      return { key: row.key, value: '' };
    }
    return row;
  });

  const hasEnabled = safeRows.some((row) => row.key === AD_CONTROL_KEYS.enabled);
  const hasMinHeight = safeRows.some((row) => row.key === AD_CONTROL_KEYS.minHeight);
  const hasRefresh = safeRows.some((row) => row.key === AD_CONTROL_KEYS.refreshSeconds);
  const hasAllowed = safeRows.some((row) => row.key === AD_CONTROL_KEYS.allowedHosts);
  const hasBlocked = safeRows.some((row) => row.key === AD_CONTROL_KEYS.blockedTerms);

  if (!hasEnabled) safeRows.push({ key: AD_CONTROL_KEYS.enabled, value: runtime.enabled });
  if (!hasMinHeight) safeRows.push({ key: AD_CONTROL_KEYS.minHeight, value: runtime.minHeight });
  if (!hasRefresh) safeRows.push({ key: AD_CONTROL_KEYS.refreshSeconds, value: runtime.refreshSeconds });
  if (!hasAllowed) safeRows.push({ key: AD_CONTROL_KEYS.allowedHosts, value: runtime.allowedHosts });
  if (!hasBlocked) safeRows.push({ key: AD_CONTROL_KEYS.blockedTerms, value: runtime.blockedTerms });

  return safeRows;
};

export const isValidAdScope = (value: string | null): value is 'public' | 'admin' =>
  value === 'public' || value === 'admin';

export const toSettingPairs = (input: unknown): Array<{ key: string; value: unknown }> => {
  if (Array.isArray(input)) {
    return input
      .filter((item) => isObjectRecord(item) && typeof item.key === 'string')
      .map((item) => ({ key: String(item.key), value: item.value }));
  }

  if (isObjectRecord(input) && typeof input.key === 'string') {
    return [{ key: String(input.key), value: input.value }];
  }

  return [];
};
