# Changelog - @light-story/sdk

All notable changes to `@light-story/sdk` are documented in this file.

## [0.1.1] - 2026-10-29

### Added
- **Domain Clients Expansion**: Added `SearchClient`, `ChaptersClient`, and `CommentsClient` under `src/gateway/clients/` and exposed via `GatewayClient` (`client.search`, `client.chapters`, `client.comments`).
- **Storage Subsystem & Reader State**:
  - `ReaderProgressManager` for debounced, optimistic offline-ready reading progress tracking.
  - `BookmarkManager` with local mutation queuing for background cloud synchronization.
  - `MemoryStorageAdapter` and `WebStorageAdapter` with `createStorageAdapter` factory ensuring SSR safe fallback when `window` is undefined.
- **Frontend Integration**:
  - Integrated `SearchClient` into Search page with full SSR prefetch and graceful fallback.
  - Integrated `ReaderProgressManager` and `BookmarkManager` into Chapter Reader page with SSR initial state and interactive toolbar controls.
- **Comprehensive Test Coverage**: Expanded unit and adversarial stress test suite to 12 suites / 138 tests covering boundary conditions, LRU eviction, concurrency, and error recovery.
- **Documentation**: Added comprehensive module guides under `packages/sdk/docs/` detailing Gateway clients, StorageManager, Reader state, and formatters.

### Guaranteed
- **Zero Runtime Dependencies**: Continues strict guarantee of 0 external runtime dependencies, relying exclusively on Web Standards (`fetch`, `Headers`, `AbortController`).
