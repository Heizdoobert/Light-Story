import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterImage } from './ChapterImage';

beforeEach(() => {
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();
  class MockObserver {
    root = null; rootMargin = ''; scrollMargin = ''; thresholds = [0];
    constructor(callback: IntersectionObserverCallback) {
      setTimeout(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], this), 0);
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
    takeRecords = () => [];
  }
  vi.stubGlobal('IntersectionObserver', MockObserver);
});

describe('ChapterImage', () => {
  it('renders image with correct attributes when visible', async () => {
    render(<ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} />);
    const img = await screen.findByAltText('Trang 1');
    expect(img).toBeDefined();
    expect(img.getAttribute('decoding')).toBe('async');
  });
});
