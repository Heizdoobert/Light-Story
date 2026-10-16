// Cloudflare Workers KV and R2 client wrappers
// These are only available in the server (Workers) environment.
// On the client side they resolve to null to avoid bundling server-only code.

/** KV binding placeholder. In the actual Worker, the KV namespace is injected via the environment
 *  (e.g., export interface Env { MY_KV: KVNamespace; }) and accessed as `env.MY_KV`.
 *  For simplicity we expose a global `KV` that can be set by the Worker entry point.
 */
export const kv = typeof window === 'undefined' ? ((globalThis as Record<string, unknown>).KV ?? null) : null;

/** R2 bucket binding placeholder. Similar to KV, the bucket is injected via the environment.
 *  It is exposed as a global `R2` for access in server code.
 */
export const r2 = typeof window === 'undefined' ? ((globalThis as Record<string, unknown>).R2 ?? null) : null;
