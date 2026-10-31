// Cloudflare Workers R2 client wrapper
// Only available in the server (Workers) environment.
export const r2 = typeof window === 'undefined' ? ((globalThis as Record<string, unknown>).R2 ?? null) : null;
