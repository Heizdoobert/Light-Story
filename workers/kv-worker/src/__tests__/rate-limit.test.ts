import { describe, expect, it } from 'vitest';
import { checkRateLimit, getClientIP, MAX_TRACKED_IPS, trackedIpCount } from '../middleware/rateLimit';

function req(ip: string, headers: Record<string, string> = {}): Request {
  return new Request('https://gateway.test/api/comics', {
    headers: { 'cf-connecting-ip': ip, ...headers },
  });
}

describe('getClientIP', () => {
  it('prefers cf-connecting-ip', () => {
    expect(getClientIP(req('203.0.113.9', { 'x-forwarded-for': '127.0.0.1' }))).toBe('203.0.113.9');
  });

  it('does not fall back to a client-controlled x-forwarded-for', () => {
    const r = new Request('https://gateway.test/api/comics', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    });
    // Spoofing XFF to a loopback address must not reach the loopback bypass.
    expect(getClientIP(r)).not.toBe('127.0.0.1');
  });
});

describe('checkRateLimit store bound', () => {
  it('does not grow past MAX_TRACKED_IPS', () => {
    for (let i = 0; i < MAX_TRACKED_IPS + 500; i++) {
      checkRateLimit(req(`198.51.100.${i % 256}.${i}`), false, null, '/comics');
    }
    expect(trackedIpCount()).toBeLessThanOrEqual(MAX_TRACKED_IPS);
  });

  it('still limits a single hot IP', () => {
    const ip = '203.0.113.77';
    let blocked = false;
    for (let i = 0; i < 400; i++) {
      const result = checkRateLimit(req(ip), false, null, '/comics');
      if (!result.allowed) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it('applies a finite limit to media requests', () => {
    const result = checkRateLimit(req('203.0.113.88'), false, null, '/media/covers/x.png');
    expect(result.limit).toBeLessThan(999999);
  });
});
