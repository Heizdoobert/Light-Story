import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChapterImage } from './ChapterImage';

describe('ChapterImage', () => {
  it('renders image element with loading="lazy"', () => {
    render(<ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} />);
    const img = screen.getByAltText('Trang 1');
    expect(img).toBeDefined();
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});
