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
  it('rewrites R2 URLs through gateway', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    const result = service.proxiedR2ImageUrl('https://pub-abc.r2.dev/file.jpg');
    expect(result).toBe('https://gateway.example.com/api/admin/r2?url=https%3A%2F%2Fpub-abc.r2.dev%2Ffile.jpg');
  });

  it('rewrites Cloudflare URLs through gateway', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    const result = service.proxiedR2ImageUrl('https://cloudflare.com/file.jpg');
    expect(result).toBe('https://gateway.example.com/api/admin/r2?url=https%3A%2F%2Fcloudflare.com%2Ffile.jpg');
  });

  it('returns empty string for empty input', () => {
    expect(service.proxiedR2ImageUrl('')).toBe('');
  });

  it('passes through non-R2 URLs unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_GATEWAY_URL', 'https://gateway.example.com');
    expect(service.proxiedR2ImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });
});
