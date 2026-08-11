/**
 * IMPORTANT: silent fallback — a missing env var degrades to the default worker
 * instead of throwing. Auth-bearing fetchApi calls (actions/http.ts) route to the
 * fallback host, so a prod misconfig fails silently. See ADR-001 for rationale
 * and the alternative (no-fallback) considered.
 */
export function getGatewayUrl(): string {
  const rawUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION ||
        process.env.NEXT_PUBLIC_GATEWAY_URL ||
        'https://kv-worker.hhhuygiau.workers.dev'
      : process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  return rawUrl.replace(/\/+$/, '');
}
