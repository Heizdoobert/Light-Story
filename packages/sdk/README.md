# @light-story/sdk

Light-Story Gateway SDK is a resilient, type-safe, zero-dependency TypeScript SDK for interacting with the Cloudflare Worker Gateway and Light-Story services across browsers, Node.js, Edge environments, and background workers.

## Features

- **Zero Runtime Dependencies**: Relies exclusively on standard Web APIs (`fetch`, `Headers`, `AbortController`). Tiny bundle size (≤ 15 KB gzipped) and zero cold-start latency in Cloudflare Workers.
- **Safe Idempotent Retries**: Automatically retries transient network failures, `429` (respecting `Retry-After`), and `502`/`503`/`504` server errors on safe methods (`GET`, `HEAD`, `PUT`, `DELETE`). Mutations (`POST`, `PATCH`) require explicit caller opt-in (`{ retry: true }`).
- **Configurable Timeouts**: Request-level and client-level timeouts with automatic `AbortController` cancellation and signal chaining.
- **Pluggable Logging**: Supports custom `SdkLogger` interfaces (debug, info, warn, error) with a silent default.
- **Typed Gateway Domain APIs**: High-level modules for Comics, Stories, Admin, Analytics, R2 Media, and User reading history/bookmarks.

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

// Comics API
const comics = await sdk.comics.list({ page: 1, limit: 20 });

// Stories API
const categories = await sdk.stories.getCategories();

// R2 Storage API
const { signedUrl } = await sdk.r2.getSignedUrl('covers/comic-1.webp');

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
