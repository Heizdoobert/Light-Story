import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as sdk from '../index';

describe('public contract', () => {
  it('keeps zero runtime dependencies', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it('keeps a stable set of defined public exports', () => {
    const names = Object.keys(sdk).sort();
    expect(names).toEqual([
      'AdminClient',
      'AnalyticsClient',
      'BookmarkManager',
      'ChaptersClient',
      'ComicsClient',
      'CommentsClient',
      'DEFAULT_ALLOWED_EXTENSIONS',
      'DEFAULT_ALLOWED_MIME_TYPES',
      'DEFAULT_BACKOFF_BASE_MS',
      'DEFAULT_MAX_DELAY_MS',
      'DEFAULT_MAX_FILE_SIZE',
      'DEFAULT_MAX_RETRIES',
      'DEFAULT_RETRY_STATUS_CODES',
      'DEFAULT_SAFE_METHODS',
      'GatewayApi',
      'GatewayClient',
      'GatewayError',
      'HealthClient',
      'HttpClient',
      'IndexedDBStorageAdapter',
      'InterceptorManager',
      'LightStoryClient',
      'MemoryStorageAdapter',
      'R2Client',
      'ReaderProgressManager',
      'SdkNetworkError',
      'SdkTimeoutError',
      'SearchClient',
      'StorageManager',
      'StoriesClient',
      'UserClient',
      'WebStorageAdapter',
      'calculateRetryDelay',
      'createGatewayClient',
      'createInterceptors',
      'createLightStoryClient',
      'createStorageAdapter',
      'createStorageManager',
      'extractFileExtension',
      'formatBytes',
      'formatChapterNumber',
      'formatChapterTitle',
      'formatCompactNumber',
      'formatCurrency',
      'formatDate',
      'formatDateTime',
      'formatNumber',
      'formatPercentage',
      'formatRelativeTime',
      'formatters',
      'isMethodIdempotent',
      'loadComponent',
      'removeVietnameseAccents',
      'resolveRetryConfig',
      'sanitizeFolder',
      'sanitizeStorageKey',
      'shouldRetryRequest',
      'sleepWithSignal',
      'slugify',
      'storageManager',
      'truncate',
    ]);
    expect(Object.values(sdk).every((value) => value !== undefined)).toBe(true);
  });
});
