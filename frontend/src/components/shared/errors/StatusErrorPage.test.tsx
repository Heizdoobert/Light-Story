import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('StatusErrorPage', () => {
  it('renders status code, title, and message', async () => {
    const { StatusErrorPage } = await import('./StatusErrorPage');
    render(<StatusErrorPage statusCode={404} title="Not Found" message="missing" />);
    expect(screen.getByText('Error 404')).toBeDefined();
    expect(screen.getByText('Not Found')).toBeDefined();
    expect(screen.getByText('missing')).toBeDefined();
  });

  it('shows action link with default label', async () => {
    const { StatusErrorPage } = await import('./StatusErrorPage');
    render(<StatusErrorPage statusCode={500} title="Err" message="msg" />);
    const link = screen.getByRole('link');
    expect(link.textContent).toBe('Back To Home');
    expect(link.getAttribute('href')).toBe('/');
  });

  it('shows custom action label and href', async () => {
    const { StatusErrorPage } = await import('./StatusErrorPage');
    render(<StatusErrorPage statusCode={403} title="Forbidden" message="nope" actionLabel="Go Login" actionHref="/login" />);
    const link = screen.getByRole('link');
    expect(link.textContent).toBe('Go Login');
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('shows reload button when showReload is true', async () => {
    const { StatusErrorPage } = await import('./StatusErrorPage');
    render(<StatusErrorPage statusCode={500} title="Err" message="msg" showReload />);
    expect(screen.getByText('Reload')).toBeDefined();
  });

  it('hides reload button when showReload is false', async () => {
    const { StatusErrorPage } = await import('./StatusErrorPage');
    render(<StatusErrorPage statusCode={500} title="Err" message="msg" showReload={false} />);
    expect(screen.queryByText('Reload')).toBeNull();
  });
});