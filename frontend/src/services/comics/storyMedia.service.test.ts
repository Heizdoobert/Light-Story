import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/covers/abc.png' } }));

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl })),
    },
  },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('uploadStoryCoverImage', () => {
  it('uploads file and returns public URL', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/covers/abc.png' } });

    const { uploadStoryCoverImage } = await import('./storyMedia.service');
    const file = new File([''], 'test.png', { type: 'image/png' });

    const url = await uploadStoryCoverImage(file);
    expect(url).toBe('https://cdn.example.com/covers/abc.png');
  });

  it('throws on upload error', async () => {
    mockUpload.mockResolvedValue({ error: new Error('upload failed') });

    const { uploadStoryCoverImage } = await import('./storyMedia.service');
    await expect(uploadStoryCoverImage(new File([''], 'x.png'))).rejects.toThrow('upload failed');
  });

  it('throws when no public URL returned', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } });

    const { uploadStoryCoverImage } = await import('./storyMedia.service');
    await expect(uploadStoryCoverImage(new File([''], 'x.png'))).rejects.toThrow('Unable to resolve');
  });
});