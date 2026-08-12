export const FALLBACK_GATEWAY_URL = 'https://kv-worker.hhhuygiau.workers.dev';

let warnedFallback = false;

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
        FALLBACK_GATEWAY_URL
      : process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  if (rawUrl === FALLBACK_GATEWAY_URL && !warnedFallback) {
    // ponytail: no telemetry pipeline in this client; deduped warn once per session
    warnedFallback = true;
    console.warn(
      { event: 'gateway_url_fallback', gatewayUrl: rawUrl },
      'gateway env vars unset in production - routing to default worker (ADR-001)',
    );
  }
  return rawUrl.replace(/\/+$/, '');
}
