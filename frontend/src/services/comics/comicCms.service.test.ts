import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as service from './comicCms.service';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxiedR2ImageUrl', () => {
  it('rewrites R2 URLs through the public media route', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    const result = service.proxiedR2ImageUrl('https://pub-abc.r2.dev/chapters/a/ch_1/001.jpg');
    expect(result).toBe(
      'https://gateway.example.com/api/media/chapters%2Fa%2Fch_1%2F001.jpg',
    );
  });

  it('rewrites Cloudflare URLs through the public media route', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    const result = service.proxiedR2ImageUrl('https://cloudflare.com/file.jpg');
    expect(result).toBe('https://gateway.example.com/api/media/file.jpg');
  });

  it('returns empty string for empty input', () => {
    expect(service.proxiedR2ImageUrl('')).toBe('');
  });

  it('passes through non-R2 URLs unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    expect(service.proxiedR2ImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });
});
