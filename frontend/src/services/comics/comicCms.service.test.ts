import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as service from './comicCms.service';
import { apiClient } from '@/lib/api/apiClient';

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_RECORD: service.ComicCmsRecord = {
  id: 'comic-1',
  title: 'Test Comic',
  author: 'Test Author',
  description: 'A test comic',
  status: 'published',
  coverUrl: 'https://example.com/cover.jpg',
  viewCount: 42,
  lastUpdatedAt: '2026-06-01T00:00:00Z',
  chapters: [],
  category: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleteComic', () => {
  it('DELETEs comic and removes from catalog', async () => {
    localStorage.setItem('comic-cms:catalog', JSON.stringify([MOCK_RECORD, { ...MOCK_RECORD, id: 'other' }]));
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

    await service.deleteComic('comic-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/api/admin/comics/comic-1');
    const catalog = JSON.parse(localStorage.getItem('comic-cms:catalog')!);
    expect(catalog).toHaveLength(1);
    expect(catalog[0].id).toBe('other');
  });
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
