import { render, screen, fireEvent, act } from '@testing-library/react';
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
    expect(img.getAttribute('src')).toContain('page-1.jpg');
  });

  it('reserves space with an inline aspect ratio when not in fitScreen mode (FOUC-proof CLS guard)', () => {
    const { container } = render(
      <ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} />,
    );
    const pageWrap = container.querySelector('[data-testid="chapter-image-container"]');
    expect(pageWrap).not.toBeNull();
    // Inline style, not a Tailwind class: the aspect must apply even if the
    // stylesheet chunk arrives after the first paint (late-CSS layout shift).
    expect(pageWrap!.getAttribute('style')).toContain('aspect-ratio: 3 / 4');
  });

  it('safely releases resources and unmounts without error', () => {
    const { unmount } = render(
      <ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} />,
    );
    expect(() => unmount()).not.toThrow();
  });

  it('automatically retries with exponential backoff on error up to MAX_AUTO_RETRIES, then displays manual retry', async () => {
    vi.useFakeTimers();
    try {
      render(<ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} priority />);
      
      let img = screen.getByAltText('Trang 1');
      expect(decodeURIComponent(img.getAttribute('src') || '')).not.toContain('retry=');

      // Attempt 1 fails -> triggers auto-retry 1
      await act(async () => {
        fireEvent.error(img);
      });

      // Error UI should NOT appear yet
      expect(screen.queryByText(/Không thể tải trang 1/i)).toBeNull();

      // Advance backoff delay (1000 * 2^0 + jitter <= 1200ms)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      // Image src should now have retry cache-buster param
      img = screen.getByAltText('Trang 1');
      expect(decodeURIComponent(img.getAttribute('src') || '')).toContain('retry=');
      const firstRetrySrc = img.getAttribute('src');

      // Attempt 2 fails -> triggers auto-retry 2
      await act(async () => {
        fireEvent.error(img);
      });
      expect(screen.queryByText(/Không thể tải trang 1/i)).toBeNull();

      // Advance backoff delay (1000 * 2^1 + jitter <= 2200ms)
      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      img = screen.getByAltText('Trang 1');
      const secondRetrySrc = img.getAttribute('src');
      expect(secondRetrySrc).not.toBe(firstRetrySrc);

      // Attempt 3 fails -> triggers auto-retry 3
      await act(async () => {
        fireEvent.error(img);
      });
      expect(screen.queryByText(/Không thể tải trang 1/i)).toBeNull();

      // Advance backoff delay (min(1000 * 2^2, 4000) + jitter <= 4200ms)
      await act(async () => {
        vi.advanceTimersByTime(4500);
      });
      img = screen.getByAltText('Trang 1');
      const thirdRetrySrc = img.getAttribute('src');
      expect(thirdRetrySrc).not.toBe(secondRetrySrc);

      // Attempt 4 fails -> exceeds MAX_AUTO_RETRIES (3)
      await act(async () => {
        fireEvent.error(img);
      });

      // Now error fallback UI must be displayed
      expect(screen.getByText('Không thể tải trang 1')).toBeDefined();
      const retryBtn = screen.getByRole('button', { name: /thử lại/i });
      expect(retryBtn).toBeDefined();

      // Clicking manual retry resets autoRetryCount and triggers a fresh attempt
      await act(async () => {
        fireEvent.click(retryBtn);
      });

      expect(screen.queryByText(/Không thể tải trang 1/i)).toBeNull();
      img = screen.getByAltText('Trang 1');
      expect(img).toBeDefined();
      expect(decodeURIComponent(img.getAttribute('src') || '')).toContain('retry=');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels pending retry timer when component unmounts', async () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} priority />);
      const img = screen.getByAltText('Trang 1');

      await act(async () => {
        fireEvent.error(img);
      });

      // Unmount before backoff timer fires
      unmount();

      // Advancing timer after unmount should not throw or cause state update warnings
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
