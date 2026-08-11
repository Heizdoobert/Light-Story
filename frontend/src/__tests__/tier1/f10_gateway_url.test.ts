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
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL_PRODUCTION', '');
    expect(getGatewayUrl()).toBe(DEV);
  });

  it('prefers the production URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', DEV);
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL_PRODUCTION', `${PROD}/`);
    expect(getGatewayUrl()).toBe(PROD);
  });

  it('falls back to the hardcoded production URL when none is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', '');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL_PRODUCTION', '');
    expect(getGatewayUrl()).toBe('https://kv-worker.hhhuygiau.workers.dev');
  });

  it('falls back to the localhost dev URL outside production when none is configured', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', '');
    expect(getGatewayUrl()).toBe('http://localhost:8787');
  });

  it('warns once with a structured event when production falls back to the hardcoded URL', async () => {
    vi.resetModules();
    const { getGatewayUrl: fresh } = await import('@/lib/utils/gateway-url');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', '');
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL_PRODUCTION', '');
    fresh();
    fresh();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ event: 'gateway_url_fallback' });
    spy.mockRestore();
  });
});
