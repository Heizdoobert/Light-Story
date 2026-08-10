import { describe, it, expect, afterEach, vi } from 'vitest';
import { getGatewayUrl } from '@/lib/utils/gateway-url';

const DEV = 'https://dev.example';
const PROD = 'https://prod.example';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getGatewayUrl', () => {
  it('uses the dev URL outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', `${DEV}/`);
    expect(getGatewayUrl()).toBe(DEV);
  });

  it('falls back to the dev URL when production URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', DEV);
    expect(getGatewayUrl()).toBe(DEV);
  });

  it('prefers the production URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', DEV);
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL_PRODUCTION', `${PROD}/`);
    expect(getGatewayUrl()).toBe(PROD);
  });

  it('throws when no URL is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getGatewayUrl()).toThrow('Missing NEXT_PUBLIC_GATEWAY_URL');
  });
});
