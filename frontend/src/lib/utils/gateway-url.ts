export function getGatewayUrl(): string {
  const rawUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL
      : process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!rawUrl) {
    throw new Error('Missing NEXT_PUBLIC_GATEWAY_URL');
  }
  return rawUrl.replace(/\/+$/, '');
}
