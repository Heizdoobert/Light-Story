import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComicCardSkeleton } from './ComicCardSkeleton';

describe('ComicCardSkeleton', () => {
  it('renders skeleton shimmer container', () => {
    const { container } = render(<ComicCardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
