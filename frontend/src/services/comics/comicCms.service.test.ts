import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as comicService from './comic.service';
import * as service from './comicCms.service';
import { apiClient } from '@/lib/api/apiClient';
import type { ComicCmsFormValues } from '@/lib/schemas/comic-cms-schemas';

vi.mock('./comic.service', () => ({
  uploadComicCover: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_DB_ROW = {
  id: 'comic-1',
  title: 'Test Comic',
  author: 'Test Author',
  description: 'A test comic',
  status: 'published',
  cover_url: 'https://example.com/cover.jpg',
  views: 42,
  updated_at: '2026-06-01T00:00:00Z',
};

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

describe('fetchComicCatalog', () => {
  it('maps DB rows to ComicCmsRecord and caches in localStorage', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([MOCK_DB_ROW]);

    const result = await service.fetchComicCatalog();

    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/comics?pageSize=100');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(MOCK_RECORD);
    expect(JSON.parse(localStorage.getItem('comic-cms:catalog')!)).toEqual([MOCK_RECORD]);
  });

  it('returns empty array on API failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

    const result = await service.fetchComicCatalog();

    expect(result).toEqual([]);
  });

  it('uses cached catalog when no server data', async () => {
    localStorage.setItem('comic-cms:catalog', JSON.stringify([MOCK_RECORD]));

    const cached = service.loadComicCatalog();
    expect(cached).toEqual([MOCK_RECORD]);
  });
});

describe('createComicFromMetadata', () => {
  const formValues: ComicCmsFormValues = {
    title: 'New Comic',
    slug: 'new-comic',
    author: 'New Author',
    translator: 'New Translator',
    description: 'Brand new',
    status: 'draft',
    coverUrl: '',
  };

  it('uploads cover then POSTs comic then prepends to catalog', async () => {
    vi.mocked(comicService.uploadComicCover).mockResolvedValue('https://r2.example.com/cover.jpg');
    vi.mocked(apiClient.post).mockResolvedValue({
      id: 'new-id',
      title: 'New Comic',
      author: 'New Author',
      description: 'Brand new',
      status: 'draft',
      cover_url: 'https://r2.example.com/cover.jpg',
      views: 0,
      updated_at: '2026-06-15T00:00:00Z',
    });
    const existing = { ...MOCK_RECORD, id: 'other' };
    localStorage.setItem('comic-cms:catalog', JSON.stringify([existing]));

    const result = await service.createComicFromMetadata({ ...formValues, coverFile: new File([], 'cover.png') });

    expect(comicService.uploadComicCover).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/admin/comics', {
      title: 'New Comic',
      author: 'New Author',
      description: 'Brand new',
      status: 'draft',
      coverUrl: 'https://r2.example.com/cover.jpg',
    });
    expect(result.status).toBe('draft');
    expect(result.title).toBe('New Comic');
    const catalog = JSON.parse(localStorage.getItem('comic-cms:catalog')!);
    expect(catalog).toHaveLength(2);
    expect(catalog[0].id).toBe('new-id');
  });

  it('POSTs without cover when no coverFile provided', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(MOCK_DB_ROW);

    const result = await service.createComicFromMetadata({ ...formValues, coverFile: null });

    expect(comicService.uploadComicCover).not.toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalled();
    expect(result.title).toBe('Test Comic');
  });

  it('defaults author to Unknown when empty', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(MOCK_DB_ROW);

    await service.createComicFromMetadata({ ...formValues, author: '', coverFile: null });

    expect(apiClient.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      author: 'Unknown',
    }));
  });
});

describe('updateComicRecord', () => {
  it('PATCHes comic and updates catalog', async () => {
    localStorage.setItem('comic-cms:catalog', JSON.stringify([MOCK_RECORD]));
    vi.mocked(apiClient.patch).mockResolvedValue({ ...MOCK_DB_ROW, title: 'Updated Title' });

    const result = await service.updateComicRecord({ ...MOCK_RECORD, title: 'Updated Title' });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/admin/comics/comic-1', {
      title: 'Updated Title',
      author: 'Test Author',
      description: 'A test comic',
      status: 'published',
      coverUrl: 'https://example.com/cover.jpg',
    });
    expect(result.title).toBe('Updated Title');
    const catalog = JSON.parse(localStorage.getItem('comic-cms:catalog')!);
    expect(catalog[0].title).toBe('Updated Title');
  });

  it('prepends to catalog when comic not found', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue(MOCK_DB_ROW);

    await service.updateComicRecord(MOCK_RECORD);

    const catalog = JSON.parse(localStorage.getItem('comic-cms:catalog')!);
    expect(catalog[0].id).toBe('comic-1');
  });
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

describe('sortFilesByFilename', () => {
  it('sorts files by name with numeric ordering', () => {
    const files = [
      new File([], 'page10.png'),
      new File([], 'page2.png'),
      new File([], 'page1.png'),
    ];
    const sorted = service.sortFilesByFilename(files);
    expect(sorted[0].name).toBe('page1.png');
    expect(sorted[1].name).toBe('page2.png');
    expect(sorted[2].name).toBe('page10.png');
  });
});

describe('loadComicRecord', () => {
  it('finds comic by ID in catalog', () => {
    localStorage.setItem('comic-cms:catalog', JSON.stringify([MOCK_RECORD]));
    const result = service.loadComicRecord('comic-1');
    expect(result).toEqual(MOCK_RECORD);
  });

  it('returns null when not found', () => {
    localStorage.setItem('comic-cms:catalog', JSON.stringify([MOCK_RECORD]));
    expect(service.loadComicRecord('nonexistent')).toBeNull();
  });
});

describe('draft persistence', () => {
  const draft: ComicCmsFormValues = {
    title: 'Draft Title',
    slug: 'draft-title',
    author: 'Draft Author',
    translator: 'Draft Translator',
    description: 'Draft desc',
    status: 'draft',
    coverUrl: '',
  };

  it('saveComicDraft stores to localStorage', () => {
    service.saveComicDraft('test-key', draft);
    const raw = localStorage.getItem('comic-cms:draft:test-key');
    expect(JSON.parse(raw!)).toEqual(draft);
  });

  it('clearComicDraft removes draft from localStorage', () => {
    localStorage.setItem('comic-cms:draft:test-key', JSON.stringify(draft));
    service.clearComicDraft('test-key');
    expect(localStorage.getItem('comic-cms:draft:test-key')).toBeNull();
  });
});

describe('recordComicAudit', () => {
  it('POSTs audit event, does not throw on failure', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true });

    await service.recordComicAudit('comic.create', { comicId: 'c1' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/admin/audit', expect.objectContaining({
      action: 'comic.create',
      entity_type: 'comic',
    }));
  });

  it('swallows errors gracefully', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));
    await expect(service.recordComicAudit('comic.create', {})).resolves.toBeUndefined();
  });
});

describe('moderation state', () => {
  it('returns default moderation state when nothing saved', () => {
    const state = service.listComicModerationState();
    expect(state.keywords).toContain('spoiler');
    expect(state.reportedComments).toEqual([]);
  });

  it('saveComicModerationState persists to localStorage', () => {
    const state = { keywords: ['custom'], reportedComments: [] };
    service.saveComicModerationState(state);
    expect(JSON.parse(localStorage.getItem('comic-cms:moderation')!)).toEqual(state);
  });
});
