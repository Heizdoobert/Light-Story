import { describe, it, expect } from 'vitest';
import { sanitizeImageUrl } from './securityUtils';

describe('sanitizeImageUrl', () => {
  it('allows valid http, https, blob, data, and relative image URLs', () => {
    expect(sanitizeImageUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
    expect(sanitizeImageUrl('http://example.com/cover.jpg')).toBe('http://example.com/cover.jpg');
    expect(sanitizeImageUrl('blob:http://localhost:3000/123-456')).toBe('blob:http://localhost:3000/123-456');
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(sanitizeImageUrl('/avatars/user.png')).toBe('/avatars/user.png');
  });

  it('rejects dangerous XSS script schemes and invalid URLs', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeImageUrl('//malicious-site.com/script.js')).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl(undefined)).toBeNull();
  });
});
