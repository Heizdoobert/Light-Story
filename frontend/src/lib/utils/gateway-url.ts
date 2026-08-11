export function getGatewayUrl(): string {
  const rawUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION ||
        process.env.NEXT_PUBLIC_GATEWAY_URL ||
        'https://kv-worker.hhhuygiau.workers.dev'
      : process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  return rawUrl.replace(/\/+$/, '');
}
