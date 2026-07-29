import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');
    render(<ErrorBoundary><p>hello</p></ErrorBoundary>);
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('renders error page when child throws', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const Bomb = () => { throw new Error('boom'); };
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Error 500')).toBeDefined();
    expect(screen.getByText('Internal Server Error')).toBeDefined();
  });

  it('shows error message in dev environment', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const Bomb = () => { throw new Error('dev-msg'); };
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('dev-msg')).toBeDefined();
    vi.unstubAllEnvs();
  });

  it('hides error message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const Bomb = () => { throw new Error('secret'); };
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.queryByText('secret')).toBeNull();
    vi.unstubAllEnvs();
  });
});