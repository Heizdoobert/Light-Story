# Gateway Domain Clients

The Gateway clients wrap backend Cloudflare Worker endpoints with typed, retry-aware requests.

## Unified Client Access

All domain clients can be accessed directly through `GatewayClient` (or `LightStoryClient`):

```typescript
import { createGatewayClient } from '@light-story/sdk';

const client = createGatewayClient({
  baseUrl: 'https://kv-worker.hhhuygiau.workers.dev',
  getAuthToken: async () => 'user-jwt-token',
  timeoutMs: 10000,
  retry: {
    maxRetries: 3,
    backoffBaseMs: 250,
  },
});
```

## SearchClient (`client.search`)

Provides search across comics and stories with multi-tag filtering, category arrays, status filters, and pagination.

```typescript
const searchResults = await client.search.searchStories({
  keyword: 'solo',
  category: ['Action', 'Fantasy'],
  tag: 'system',
  sort: 'popular',
  page: 1,
  pageSize: 12,
});

console.log(searchResults.items);       // StoryItem[]
console.log(searchResults.totalPages);  // number
console.log(searchResults.hasMore);     // boolean
```

## ChaptersClient (`client.chapters`)

Provides chapter listing, detail fetching, and navigation resolution for reader views.

```typescript
// List chapters by story
const chapters = await client.chapters.listByStory('story-123');

// Resolve navigation context (current, previous, next, currentIndex)
const nav = await client.chapters.resolveNavigation('story-123', 'chapter-456');
console.log(nav.previous?.id, nav.next?.id);
```

## CommentsClient (`client.comments`)

Handles comment fetching, threaded replies, liking, posting, and moderation.

```typescript
const comments = await client.comments.listComments({
  storyId: 'story-123',
  page: 1,
  pageSize: 20,
  sort: 'popular',
});

// Like comment
await client.comments.likeComment('comment-789');
```

## Other Domain Clients

- `client.comics`: Comic queries, recommendations, CRUD actions.
- `client.stories`: Story queries, categories, view counters.
- `client.admin`: Site settings, cache purging, admin metrics.
- `client.analytics`: Page views, telemetry, event reporting.
- `client.user`: Bookmarks and reading history server sync.
- `client.health`: Gateway worker health check endpoint.
