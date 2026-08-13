import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/r2/upload', () => ({
  uploadToR2: (...args: unknown[]) => uploadMock(...args),
}));

import { processCbzFile } from './cbz-processor';

async function makeCbz(names: string[]): Promise<File> {
  const zip = new JSZip();
  names.forEach((n) => zip.file(n, new Uint8Array([137, 80, 78, 71])));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'test_chapter.cbz', { type: 'application/x-cbz' });
}

describe('processCbzFile', () => {
  it('extracts, natural-sorts and uploads every page', async () => {
    uploadMock.mockResolvedValue({ success: true, url: 'chapters/x.jpg' });
    const file = await makeCbz(['10.jpg', '2.jpg', '1.jpg']);
    const res = await processCbzFile(file);
    expect(res.success).toBe(true);
    expect(res.urls).toHaveLength(3);
    expect(res.failed).toBe(0);
    expect(uploadMock).toHaveBeenCalledTimes(3);
  });

  it('counts failed pages and reports the ratio in the error', async () => {
    uploadMock
      .mockResolvedValueOnce({ success: true, url: 'chapters/1.jpg' })
      .mockResolvedValueOnce({ success: false, error: 'Upload failed (500): boom' })
      .mockResolvedValueOnce({ success: true, url: 'chapters/3.jpg' });
    const file = await makeCbz(['001.jpg', '002.jpg', '003.jpg']);
    const res = await processCbzFile(file);
    expect(res.success).toBe(true);
    expect(res.urls).toHaveLength(2);
    expect(res.failed).toBe(1);
    expect(res.error).toContain('1/3');
  });
});
