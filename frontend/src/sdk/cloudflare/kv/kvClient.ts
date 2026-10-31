// Cloudflare Workers KV client wrapper
// Only available in the server (Workers) environment.
export const kv = typeof window === 'undefined' ? ((globalThis as Record<string, unknown>).KV ?? null) : null;
