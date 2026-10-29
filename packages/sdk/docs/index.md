# @light-story/sdk Documentation

`@light-story/sdk` is a zero-runtime-dependency TypeScript library providing isomorphic client interfaces, unified storage management, offline state trackers, and formatting utilities for Light-Story.

## Architecture & Zero-Dependency Guarantee

The SDK runs seamlessly across:
- Browser (SSR hydration, React Server Components, and client components)
- Node.js environments (Next.js server runtime, background scripts, CLI)
- Cloudflare Workers (V8 isolates, Edge compute)

It depends strictly on standard Web APIs (`fetch`, `Headers`, `AbortController`, `localStorage`/`sessionStorage` with graceful memory fallback) to maintain zero runtime dependencies, instantaneous bundle startup, and minimal footprint.

## Documentation Index

- [Gateway Domain Clients](./gateway-clients.md): SearchClient, ChaptersClient, CommentsClient, StoriesClient, ComicsClient, AdminClient, AnalyticsClient, UserClient, and HealthClient.
- [Storage & Media Management](./storage.md): StorageManager, R2 presigned URLs, batch uploads with concurrency control, and storage adapters.
- [Reader State & Bookmarks](./reader-state.md): ReaderProgressManager and BookmarkManager for optimistic reading progress, reading history, and bookmark synchronization.
- [Formatters & Helpers](./formatters.md): Numbers, relative time, bytes, slugs, and chapter titles.

## Quick Installation & Monorepo Link

```json
{
  "dependencies": {
    "@light-story/sdk": "file:../packages/sdk"
  }
}
```
