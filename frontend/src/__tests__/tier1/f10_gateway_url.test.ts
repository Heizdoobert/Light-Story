import { describe, it, expect, afterEach } from 'vitest';
import { getGatewayUrl } from '@/lib/utils/gateway-url';

const DEV = 'https://dev.example';
const PROD = 'https://prod.example';

afterEach(() => {
  delete process.env.NEXT_PUBLIC_GATEWAY_URL;
  delete process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION;
  process.env.NODE_ENV = 'test';
});

describe('getGatewayUrl', () => {
  it('uses the dev URL outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_GATEWAY_URL = `${DEV}/`;
    expect(getGatewayUrl()).toBe(DEV);
  });

  it('falls back to the dev URL when production URL is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GATEWAY_URL = DEV;
    expect(getGatewayUrl()).toBe(DEV);
  });

  it('prefers the production URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GATEWAY_URL = DEV;
    process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION = `${PROD}/`;
    expect(getGatewayUrl()).toBe(PROD);
  });

  it('throws when no URL is configured', () => {
    process.env.NODE_ENV = 'production';
    expect(() => getGatewayUrl()).toThrow('Missing NEXT_PUBLIC_GATEWAY_URL');
  });
});
