import {
  parseAdRuntimeSettings,
  validateAdMarkup,
  sanitizeAdSettingValue,
  parseSiteSettingsRows,
  parseAdManagerState,
  buildDefaultAdRows,
  toSafeAdRows,
  isAllowedAdSettingKey,
  isAdSlotKey,
  normalizeToString,
  AD_CONTROL_KEYS,
  ALLOWED_AD_SETTING_KEYS,
  type AdRuntimeSettings,
} from './adPolicy';

describe('adPolicy', () => {
  describe('parseAdRuntimeSettings', () => {
    it('returns defaults when map is empty', () => {
      const result = parseAdRuntimeSettings(new Map());
      expect(result.enabled).toBe(true);
      expect(result.minHeight).toBe(120);
      expect(result.refreshSeconds).toBe(120);
      expect(result.allowedHosts).toContain('pagead2.googlesyndication.com');
      expect(result.blockedTerms).toContain('adult');
    });

    it('parses boolean enabled flag correctly', () => {
      const map = new Map([[AD_CONTROL_KEYS.enabled, false]]);
      expect(parseAdRuntimeSettings(map).enabled).toBe(false);

      const mapStr = new Map([[AD_CONTROL_KEYS.enabled, 'false']]);
      expect(parseAdRuntimeSettings(mapStr).enabled).toBe(false);

      const mapTrue = new Map([[AD_CONTROL_KEYS.enabled, 'true']]);
      expect(parseAdRuntimeSettings(mapTrue).enabled).toBe(true);
    });

    it('clamps minHeight within bounds (90-600)', () => {
      const mapLow = new Map([[AD_CONTROL_KEYS.minHeight, 10]]);
      expect(parseAdRuntimeSettings(mapLow).minHeight).toBe(90);

      const mapHigh = new Map([[AD_CONTROL_KEYS.minHeight, 900]]);
      expect(parseAdRuntimeSettings(mapHigh).minHeight).toBe(600);

      const mapValid = new Map([[AD_CONTROL_KEYS.minHeight, 200]]);
      expect(parseAdRuntimeSettings(mapValid).minHeight).toBe(200);
    });

    it('parses allowed hosts from comma-separated string', () => {
      const map = new Map([
        [AD_CONTROL_KEYS.allowedHosts, 'google.com, facebook.com, twitter.com'],
      ]);
      const result = parseAdRuntimeSettings(map);
      expect(result.allowedHosts).toEqual(['google.com', 'facebook.com', 'twitter.com']);
    });

    it('parses allowed hosts from JSON array', () => {
      const map = new Map([
        [AD_CONTROL_KEYS.allowedHosts, ['google.com', 'facebook.com']],
      ]);
      const result = parseAdRuntimeSettings(map);
      expect(result.allowedHosts).toEqual(['google.com', 'facebook.com']);
    });

    it('parses blocked terms and normalizes to lowercase', () => {
      const map = new Map([[AD_CONTROL_KEYS.blockedTerms, 'Adult, XXX, PORN']]);
      const result = parseAdRuntimeSettings(map);
      expect(result.blockedTerms).toEqual(['adult', 'xxx', 'porn']);
    });
  });

  describe('validateAdMarkup', () => {
    const defaultRuntime: AdRuntimeSettings = {
      enabled: true,
      minHeight: 120,
      refreshSeconds: 120,
      allowedHosts: ['pagead2.googlesyndication.com'],
      blockedTerms: ['adult', 'xxx', 'porn'],
    };

    it('accepts empty markup', () => {
      const result = validateAdMarkup('', defaultRuntime);
      expect(result.ok).toBe(true);
    });

    it('rejects markup with iframe tag', () => {
      const result = validateAdMarkup('<iframe src="evil.com"></iframe>', defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('iframe');
    });

    it('rejects markup with object tag', () => {
      const result = validateAdMarkup('<object data="evil"></object>', defaultRuntime);
      expect(result.ok).toBe(false);
    });

    it('rejects markup with inline event handlers', () => {
      const result = validateAdMarkup('<div onclick="alert(1)"></div>', defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('event');
    });

    it('rejects markup with javascript: protocol', () => {
      const result = validateAdMarkup('<a href="javascript:void(0)">link</a>', defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('javascript');
    });

    it('rejects markup containing blocked terms', () => {
      const result = validateAdMarkup('This ad is for adult content', defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('blocked terms');
    });

    it('accepts markup with allowed script host', () => {
      const markup = '<script src="https://pagead2.googlesyndication.com/ads.js"></script>';
      const result = validateAdMarkup(markup, defaultRuntime);
      expect(result.ok).toBe(true);
    });

    it('rejects markup with disallowed script host', () => {
      const markup = '<script src="https://evil.com/ads.js"></script>';
      const result = validateAdMarkup(markup, defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('rejects markup exceeding size limit (20KB)', () => {
      const bigMarkup = 'x'.repeat(25000);
      const result = validateAdMarkup(bigMarkup, defaultRuntime);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('size limit');
    });

    it('accepts valid Google AdSense markup', () => {
      const markup = `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-123"></script>
        <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-123" data-ad-slot="4567"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      `;
      const result = validateAdMarkup(markup, defaultRuntime);
      expect(result.ok).toBe(true);
    });

    it('handles case-insensitive event handler detection', () => {
      const result = validateAdMarkup('<div OnClick="alert(1)"></div>', defaultRuntime);
      expect(result.ok).toBe(false);
    });
  });

  describe('sanitizeAdSettingValue', () => {
    it('sanitizes enabled flag to boolean', () => {
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.enabled, 'true')).toBe(true);
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.enabled, 'false')).toBe(false);
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.enabled, 1)).toBe(true);
    });

    it('sanitizes minHeight to bounded integer', () => {
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.minHeight, '150')).toBe(150);
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.minHeight, 10)).toBe(90); // Clamped to min
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.minHeight, 1000)).toBe(600); // Clamped to max
    });

    it('sanitizes refreshSeconds to bounded integer', () => {
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.refreshSeconds, '60')).toBe(60);
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.refreshSeconds, 5)).toBe(15); // Clamped to min
      expect(sanitizeAdSettingValue(AD_CONTROL_KEYS.refreshSeconds, 7200)).toBe(3600); // Clamped to max
    });

    it('sanitizes allowedHosts to array', () => {
      const result = sanitizeAdSettingValue(
        AD_CONTROL_KEYS.allowedHosts,
        'google.com, facebook.com',
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['google.com', 'facebook.com']);
    });

    it('sanitizes blockedTerms to array', () => {
      const result = sanitizeAdSettingValue(AD_CONTROL_KEYS.blockedTerms, 'Adult, XXX');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['adult', 'xxx']);
    });

    it('sanitizes ad slot markup to string', () => {
      const markup = '<script>console.log("test")</script>';
      const result = sanitizeAdSettingValue('ad_header', markup);
      expect(typeof result).toBe('string');
      expect(result).toBe(markup);
    });

    it('returns value as-is for unknown keys', () => {
      const unknownValue = { foo: 'bar' };
      const result = sanitizeAdSettingValue('unknown_key', unknownValue);
      expect(result).toEqual(unknownValue);
    });
  });

  describe('parseSiteSettingsRows', () => {
    it('parses rows into map, runtime, and slotMarkup', () => {
      const rows = [
        { key: 'ad_header', value: '<script>header</script>' },
        { key: AD_CONTROL_KEYS.enabled, value: true },
        { key: AD_CONTROL_KEYS.minHeight, value: 150 },
      ];

      const result = parseSiteSettingsRows(rows);

      expect(result.map.has('ad_header')).toBe(true);
      expect(result.runtime.enabled).toBe(true);
      expect(result.runtime.minHeight).toBe(150);
      expect(result.slotMarkup.ad_header).toContain('header');
    });

    it('handles empty rows array', () => {
      const result = parseSiteSettingsRows([]);
      expect(result.runtime.enabled).toBe(true); // Defaults
      expect(result.slotMarkup.ad_header).toBe('');
      expect(result.slotMarkup.ad_middle).toBe('');
      expect(result.slotMarkup.ad_sidebar).toBe('');
    });
  });

  describe('parseAdManagerState', () => {
    it('parses reusable admin form state from site settings rows', () => {
      const rows = [
        { key: 'ad_header', value: '<p>Header</p>' },
        { key: 'ad_middle', value: '<p>Middle</p>' },
        { key: 'ad_sidebar', value: '<p>Sidebar</p>' },
        { key: AD_CONTROL_KEYS.enabled, value: false },
        { key: AD_CONTROL_KEYS.minHeight, value: 180 },
        { key: AD_CONTROL_KEYS.refreshSeconds, value: 90 },
        { key: AD_CONTROL_KEYS.allowedHosts, value: ['example.com', 'cdn.example.com'] },
        { key: AD_CONTROL_KEYS.blockedTerms, value: ['adult', 'casino'] },
      ];

      const result = parseAdManagerState(rows);

      expect(result.configs.ad_header).toContain('Header');
      expect(result.configs.ad_middle).toContain('Middle');
      expect(result.configs.ad_sidebar).toContain('Sidebar');
      expect(result.controls.enabled).toBe(false);
      expect(result.controls.minHeight).toBe('180');
      expect(result.controls.refreshSeconds).toBe('90');
      expect(result.controls.allowedHosts).toBe('example.com, cdn.example.com');
      expect(result.controls.blockedTerms).toBe('adult, casino');
    });
  });

  describe('buildDefaultAdRows', () => {
    it('returns all default ad setting rows', () => {
      const rows = buildDefaultAdRows();
      expect(rows.length).toBeGreaterThan(0);

      const keys = rows.map((r) => r.key);
      expect(keys).toContain(AD_CONTROL_KEYS.enabled);
      expect(keys).toContain(AD_CONTROL_KEYS.minHeight);
      expect(keys).toContain('ad_header');
      expect(keys).toContain('ad_middle');
      expect(keys).toContain('ad_sidebar');
    });

    it('includes sensible defaults', () => {
      const rows = buildDefaultAdRows();
      const enabled = rows.find((r) => r.key === AD_CONTROL_KEYS.enabled);
      expect(enabled?.value).toBe(true);
    });
  });

  describe('toSafeAdRows', () => {
    it('sanitizes invalid ad markup', () => {
      const rows = [
        { key: 'ad_header', value: '<iframe src="evil.com"></iframe>' },
        { key: AD_CONTROL_KEYS.enabled, value: true },
      ];

      const safe = toSafeAdRows(rows);
      const headerRow = safe.find((r) => r.key === 'ad_header');
      expect(headerRow?.value).toBe(''); // Cleared due to validation failure
    });

    it('includes all control keys in output', () => {
      const rows = [{ key: 'ad_header', value: '<p>test</p>' }];
      const safe = toSafeAdRows(rows);

      const keys = safe.map((r) => r.key);
      expect(keys).toContain(AD_CONTROL_KEYS.enabled);
      expect(keys).toContain(AD_CONTROL_KEYS.minHeight);
      expect(keys).toContain(AD_CONTROL_KEYS.allowedHosts);
    });

    it('preserves valid markup', () => {
      const validMarkup = '<p>Valid ad</p>';
      const rows = [
        { key: 'ad_header', value: validMarkup },
        { key: AD_CONTROL_KEYS.enabled, value: true },
      ];

      const safe = toSafeAdRows(rows);
      const headerRow = safe.find((r) => r.key === 'ad_header');
      expect(headerRow?.value).toBe(validMarkup);
    });
  });

  describe('isAllowedAdSettingKey', () => {
    it('returns true for allowed keys', () => {
      expect(isAllowedAdSettingKey(AD_CONTROL_KEYS.enabled)).toBe(true);
      expect(isAllowedAdSettingKey('ad_header')).toBe(true);
      expect(isAllowedAdSettingKey('ad_middle')).toBe(true);
    });

    it('returns false for disallowed keys', () => {
      expect(isAllowedAdSettingKey('random_key')).toBe(false);
      expect(isAllowedAdSettingKey('admin_secret')).toBe(false);
    });
  });

  describe('isAdSlotKey', () => {
    it('returns true for ad slot keys', () => {
      expect(isAdSlotKey('ad_header')).toBe(true);
      expect(isAdSlotKey('ad_middle')).toBe(true);
      expect(isAdSlotKey('ad_sidebar')).toBe(true);
    });

    it('returns false for non-slot keys', () => {
      expect(isAdSlotKey(AD_CONTROL_KEYS.enabled)).toBe(false);
      expect(isAdSlotKey('random')).toBe(false);
    });
  });

  describe('normalizeToString', () => {
    it('handles string input', () => {
      expect(normalizeToString('hello')).toBe('hello');
    });

    it('handles number input', () => {
      expect(normalizeToString(42)).toBe('42');
      expect(normalizeToString(3.14)).toBe('3.14');
    });

    it('handles boolean input', () => {
      expect(normalizeToString(true)).toBe('true');
      expect(normalizeToString(false)).toBe('false');
    });

    it('handles null and undefined', () => {
      expect(normalizeToString(null)).toBe('');
      expect(normalizeToString(undefined)).toBe('');
    });

    it('handles array input', () => {
      expect(normalizeToString(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('handles object input by JSON stringifying', () => {
      const result = normalizeToString({ key: 'value' });
      expect(result).toContain('key');
      expect(result).toContain('value');
    });
  });

  describe('ALLOWED_AD_SETTING_KEYS constant', () => {
    it('includes all slot keys', () => {
      expect(ALLOWED_AD_SETTING_KEYS).toContain('ad_header');
      expect(ALLOWED_AD_SETTING_KEYS).toContain('ad_middle');
      expect(ALLOWED_AD_SETTING_KEYS).toContain('ad_sidebar');
    });

    it('includes all control keys', () => {
      expect(ALLOWED_AD_SETTING_KEYS).toContain(AD_CONTROL_KEYS.enabled);
      expect(ALLOWED_AD_SETTING_KEYS).toContain(AD_CONTROL_KEYS.minHeight);
      expect(ALLOWED_AD_SETTING_KEYS).toContain(AD_CONTROL_KEYS.refreshSeconds);
      expect(ALLOWED_AD_SETTING_KEYS).toContain(AD_CONTROL_KEYS.allowedHosts);
      expect(ALLOWED_AD_SETTING_KEYS).toContain(AD_CONTROL_KEYS.blockedTerms);
    });

    it('does not include forbidden keys', () => {
      expect(ALLOWED_AD_SETTING_KEYS).not.toContain('admin_secret');
      expect(ALLOWED_AD_SETTING_KEYS).not.toContain('system_key');
    });
  });
});
