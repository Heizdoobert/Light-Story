# @light-story/sdk

Light-Story Gateway SDK is a resilient, type-safe, zero-dependency TypeScript SDK for interacting with the Cloudflare Worker Gateway and Light-Story services across browsers, Node.js, Edge environments, and background workers.

## Features

- **Zero Runtime Dependencies**: Relies exclusively on standard Web APIs (`fetch`, `Headers`, `AbortController`). Tiny bundle size (≤ 15 KB gzipped) and zero cold-start latency in Cloudflare Workers.
- **Unified Storage Manager**: Dedicated `StorageManager` module for uploading, batch uploads with progress and concurrency control, generating public/CDN/proxy URLs, presigned URLs, listing objects, and batch cleanup.
- **Safe Idempotent Retries**: Automatically retries transient network failures, `429` (respecting `Retry-After`), and `502`/`503`/`504` server errors on safe methods (`GET`, `HEAD`, `PUT`, `DELETE`). Mutations (`POST`, `PATCH`) require explicit caller opt-in (`{ retry: true }`).
- **Configurable Timeouts**: Request-level and client-level timeouts with automatic `AbortController` cancellation and signal chaining.
- **Pluggable Logging**: Supports custom `SdkLogger` interfaces (debug, info, warn, error) with a silent default.
- **Typed Gateway Domain APIs**: High-level modules for Comics, Stories, Admin, Analytics, R2 Storage, and User reading history/bookmarks.

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@light-story/sdk": "file:../packages/sdk"
  }
}
```

## Quick Start

```typescript
import { createLightStoryClient } from '@light-story/sdk';

const sdk = createLightStoryClient({
  baseUrl: 'https://api.light-story.com',
  getAuthToken: async () => {
    // Dynamic JWT or session token getter
    return 'user-access-token';
  },
  timeoutMs: 15000,
  retry: {
    maxRetries: 3,
    backoffBaseMs: 300,
  },
});

// Storage Manager API
const uploadResult = await sdk.storage.upload(fileBlob, {
  folder: 'covers',
  filename: 'cover.webp',
});
console.log('CDN URL:', uploadResult.publicUrl);

// Batch upload with progress reporting
const batch = await sdk.storage.uploadBatch(chapterPages, {
  concurrency: 3,
  onProgress: (p) => console.log(`Uploaded ${p.completed}/${p.total} (${p.percentage}%)`),
});

// Presigned URLs and listing
const { signedUrl } = await sdk.storage.getSignedUrl('covers/comic-1.webp');
const files = await sdk.storage.listFiles({ folder: 'covers', limit: 50 });
await sdk.storage.delete('covers/old-cover.webp');

// Formatters API
import { formatCompactNumber, formatRelativeTime, formatBytes, slugify, formatChapterTitle } from '@light-story/sdk';

formatCompactNumber(15400, 'vi'); // "15,4K"
formatRelativeTime(new Date(Date.now() - 3600000), { locale: 'vi' }); // "1 giờ trước"
formatBytes(15728640); // "15 MB"
slugify('Đấu La Đại Lục: Khởi Đầu Mới'); // "dau-la-dai-luc-khoi-dau-moi"
formatChapterTitle(15, 'Đại Chiến', { locale: 'vi' }); // "Chương 15: Đại Chiến"

// Comics API
const comics = await sdk.comics.list({ page: 1, limit: 20 });

// Stories API
const categories = await sdk.stories.getCategories();

// User Bookmarks API
await sdk.user.toggleBookmark('comic-id');
```

## Direct HTTP Client

For direct, type-safe HTTP requests:

```typescript
import { HttpClient } from '@light-story/sdk';

const http = new HttpClient({
  baseUrl: 'https://api.light-story.com',
  logger: console, // or custom SdkLogger
});

// GET with automatic retries on 503/429
const data = await http.get<{ status: string }>('/api/health');

// POST mutation (safe by default; set retry: true to opt in)
const created = await http.post('/api/comics', { title: 'New Comic' }, { retry: true });
```

## Error Handling

All failed requests throw typed `GatewayError` instances:

```typescript
import { GatewayError, SdkTimeoutError } from '@light-story/sdk';

try {
  await sdk.comics.getById('non-existent');
} catch (err) {
  if (err instanceof SdkTimeoutError) {
    console.error(`Request timed out after ${err.details.timeoutMs}ms`);
  } else if (err instanceof GatewayError) {
    console.error(`Status: ${err.status}, Code: ${err.code}, Message: ${err.message}`);
  }
}
```

## Development & Testing

```bash
# In packages/sdk
npm run typecheck
npm run test
npm run build
```
