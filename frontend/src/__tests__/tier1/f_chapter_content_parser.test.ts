import { describe, it, expect } from 'vitest';
import { parseChapterContent } from '@/lib/r2/chapter-content';

describe('parseChapterContent', () => {
  it('parses a JSON-array string of image URLs', () => {
    const result = parseChapterContent(
      JSON.stringify(['https://r2.test/a.webp', 'https://r2.test/b.webp']),
    );
    expect(result.imageUrls).toEqual(['https://r2.test/a.webp', 'https://r2.test/b.webp']);
    expect(result.isCbz).toBe(false);
    expect(result.cbzUrl).toBeNull();
  });

  it('splits a comma-separated string', () => {
    const result = parseChapterContent('https://r2.test/a.jpg, https://r2.test/b.jpg');
    expect(result.imageUrls).toEqual(['https://r2.test/a.jpg', 'https://r2.test/b.jpg']);
  });

  it('detects a bare .cbz URL string', () => {
    const result = parseChapterContent('https://r2.test/chapter-5.cbz');
    expect(result.isCbz).toBe(true);
    expect(result.cbzUrl).toBe('https://r2.test/chapter-5.cbz');
    expect(result.imageUrls).toEqual(['https://r2.test/chapter-5.cbz']);
  });

  it('detects a cbz URL inside an image array', () => {
    const result = parseChapterContent(
      JSON.stringify(['https://r2.test/a.webp', 'https://r2.test/chapter-5.cbz']),
    );
    expect(result.isCbz).toBe(true);
    expect(result.cbzUrl).toBe('https://r2.test/chapter-5.cbz');
  });

  it('accepts an array input directly', () => {
    const result = parseChapterContent(['https://r2.test/a.webp']);
    expect(result.imageUrls).toEqual(['https://r2.test/a.webp']);
  });

  it('does not crash on encrypted (ENCv1) content', () => {
    const result = parseChapterContent('ENCv1:AAAA:BBBB');
    expect(Array.isArray(result.imageUrls)).toBe(true);
    expect(result.isCbz).toBe(false);
  });

  it('does not crash on empty or null content', () => {
    expect(parseChapterContent(null).imageUrls).toEqual([]);
    expect(parseChapterContent('').imageUrls).toEqual([]);
    expect(parseChapterContent(undefined).imageUrls).toEqual([]);
  });
});
