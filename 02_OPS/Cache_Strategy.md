# Cache Strategy & Hot-Warm-Cold Architecture

## Overview
Light-Story utilizes a tiered caching strategy across Cloudflare Workers, KV store, and Durable Objects to achieve sub-millisecond edge reads, high concurrency atomic counters, and efficient database offloading.

Refer to [`cache-config.ts`](file:///D:/Light-Story/workers/kv-worker/src/config/cache-config.ts) for default configurations and TTL boundaries.

## Tiers
1. **L1 In-Memory (Isolate L1 Cache)**: In-isolate micro-cache with ~0.1ms read latency for hot paths.
2. **L2 KV Store**: Distributed edge key-value storage (`APP_KV`) with stale-while-revalidate headers.
3. **L3 Durable Objects**: Atomic state counters (`CounterDO`) handling Redis-style increment lock-free concurrency for views and analytics.
