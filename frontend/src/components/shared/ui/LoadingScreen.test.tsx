import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

describe('LoadingScreen', () => {
  it('renders a spinner', async () => {
    const { LoadingScreen } = await import('./LoadingScreen');
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });
});