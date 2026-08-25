import { describe, expect, it } from 'vitest';
import {
  buildUploadKey,
  isAllowedUploadFolder,
  isImageFileType,
  MAX_BATCH_UPLOAD_BYTES,
  MAX_PAGE_UPLOAD_BYTES,
  pageNumberFromForm,
  validateUploadBatch,
} from '../utils/r2-keys';

const uuid8 = '[0-9a-f]{8}';
const fullUuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

describe('buildUploadKey', () => {
  it('uses pageNumber when provided (chapters)', () => {
    const key = buildUploadKey({
      folder: 'chapters',
      ext: 'jpg',
      comicId: 'comic-1',
      chapterNumber: '5',
      pageNumber: '7',
      loopIndex: 0,
    });
    expect(key).toMatch(new RegExp(`^chapters/comic-1/chapter-5/page-7-${uuid8}\\.jpg$`));
  });

  it('falls back to loop index i+1 without pageNumber (backward compat)', () => {
    const key = buildUploadKey({
      folder: 'chapters',
      ext: 'png',
      comicId: 'comic-1',
      chapterNumber: '2',
      pageNumber: null,
      loopIndex: 3,
    });
    expect(key).toMatch(new RegExp(`^chapters/comic-1/chapter-2/page-4-${uuid8}\\.png$`));
  });

  it('rejects pageNumber 0, garbage, and sloppy numbers via pageNumberFromForm', () => {
    expect(pageNumberFromForm('0')).toBeNull();
    expect(pageNumberFromForm('abc')).toBeNull();
    expect(pageNumberFromForm('2.5')).toBeNull();
    expect(pageNumberFromForm('7abc')).toBeNull();
    expect(pageNumberFromForm('1e3')).toBeNull();
    expect(pageNumberFromForm(' 12 ')).toBeNull();
    expect(pageNumberFromForm('12')).toBe(12);
    expect(pageNumberFromForm(null)).toBeNull();
  });

  it('builds covers/avatars/uploads keys with full-uuid fallbacks', () => {
    expect(buildUploadKey({ folder: 'covers', ext: 'webp', comicId: 'c1', loopIndex: 0 })).toBe(`covers/c1.webp`);
    expect(buildUploadKey({ folder: 'covers', ext: 'png', loopIndex: 0 })).toMatch(new RegExp(`^covers/${fullUuid}\\.png$`));
    expect(buildUploadKey({ folder: 'avatars', ext: 'jpg', userId: 'u1', loopIndex: 0 })).toBe(`avatars/u1.jpg`);
    expect(buildUploadKey({ folder: 'avatars', ext: 'jpg', loopIndex: 0 })).toMatch(new RegExp(`^avatars/${fullUuid}\\.jpg$`));
    expect(buildUploadKey({ folder: 'uploads', ext: 'zip', loopIndex: 0 })).toMatch(new RegExp(`^uploads/${uuid8}\\.zip$`));
  });
});

describe('guards', () => {
  it('whitelists folders', () => {
    expect(isAllowedUploadFolder('chapters')).toBe(true);
    expect(isAllowedUploadFolder('evil')).toBe(false);
  });

  it('accepts image content types incl. tiff, and empty type with image ext', () => {
    expect(isImageFileType('image/jpeg')).toBe(true);
    expect(isImageFileType('image/png')).toBe(true);
    expect(isImageFileType('image/tiff')).toBe(true);
    expect(isImageFileType('', 'page 1.tiff')).toBe(true);
    expect(isImageFileType('', 'cover.JPG')).toBe(true);
    expect(isImageFileType('text/html')).toBe(false);
    expect(isImageFileType('', 'notes.txt')).toBe(false);
    expect(isImageFileType('', '')).toBe(false);
  });

  it('caps pages at 10MB and batches at 90MB', () => {
    expect(MAX_PAGE_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_BATCH_UPLOAD_BYTES).toBe(90 * 1024 * 1024);
  });
});

describe('validateUploadBatch', () => {
  const ok = (name = 'p.jpg') => ({ size: 100_000, type: 'image/jpeg', name });

  it('accepts an all-clean batch', () => {
    expect(validateUploadBatch([ok('a.jpg'), ok('b.png')])).toBeNull();
  });

  it('rejects the whole batch when one file exceeds the per-file cap', () => {
    const bad = { size: MAX_PAGE_UPLOAD_BYTES + 1, type: 'image/jpeg', name: 'huge.jpg' };
    const result = validateUploadBatch([ok(), bad]);
    expect(result).toEqual({
      status: 413,
      code: 'TOO_LARGE',
      message: `File exceeds ${MAX_PAGE_UPLOAD_BYTES / 1024 / 1024}MB: huge.jpg`,
    });
  });

  it('rejects the batch when the sum exceeds the batch cap even if each file fits', () => {
    const perFile = Math.floor(MAX_BATCH_UPLOAD_BYTES / 10); // 9MB each × 10
    const files = Array.from({ length: 11 }, () => ok());
    files.forEach((f) => (f.size = perFile));
    const result = validateUploadBatch(files);
    expect(result).toEqual({
      status: 413,
      code: 'TOO_LARGE',
      message: `Batch exceeds ${MAX_BATCH_UPLOAD_BYTES / 1024 / 1024}MB`,
    });
  });

  it('rejects zero-byte files', () => {
    const result = validateUploadBatch([{ size: 0, type: 'image/jpeg', name: 'empty.jpg' }]);
    expect(result).toEqual({ status: 400, code: 'BAD_REQUEST', message: 'Empty file: empty.jpg' });
  });

  it('rejects non-image files by type and by extension fallback', () => {
    expect(validateUploadBatch([{ size: 1, type: 'text/html', name: 'x.html' }])).toEqual({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Not an image: x.html',
    });
    expect(validateUploadBatch([{ size: 1, type: '', name: 'notes.txt' }])).toEqual({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Not an image: notes.txt',
    });
    expect(validateUploadBatch([{ size: 1, type: '', name: 'scan.tiff' }])).toBeNull();
  });
});
