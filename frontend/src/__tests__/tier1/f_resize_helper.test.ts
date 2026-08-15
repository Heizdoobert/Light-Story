import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resizeImageFile } from '@/lib/r2/resize';

const webpBlob = new Blob(['fake-webp'], { type: 'image/webp' });

function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => fakeBitmap(3000, 2000)));
  const fakeCtx = {
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    cb(webpBlob);
    return undefined;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeFile(name: string, type: string, bytes = 2 * 1024 * 1024): File {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  return new File([blob], name, { type });
}

describe('resizeImageFile', () => {
  it('returns gif files unchanged (animation would be lost by canvas)', async () => {
    const file = makeFile('anim.gif', 'image/gif');
    const result = await resizeImageFile(file);
    expect(result.file).toBe(file);
  });

  it('re-encodes a large jpg to webp at maxWidth 1600, keeping aspect ratio', async () => {
    const file = makeFile('page-1.jpg', 'image/jpeg');
    const result = await resizeImageFile(file);
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toBe('page-1.webp');
    expect(result.width).toBe(1600);
    expect(result.height).toBe(Math.round((1600 * 2000) / 3000));
  });

  it('returns undersized images untouched (no re-encode)', async () => {
    const file = makeFile('small.png', 'image/png');
    const result = await resizeImageFile(file, { maxWidth: 8000 });
    expect(result.file).toBe(file);
  });

  it('honors a custom maxWidth', async () => {
    const file = makeFile('page-1.jpg', 'image/jpeg');
    const result = await resizeImageFile(file, { maxWidth: 1200 });
    expect(result.width).toBe(1200);
  });
});
