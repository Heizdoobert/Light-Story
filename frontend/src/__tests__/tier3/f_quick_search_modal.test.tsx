import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickSearchModal } from '@/components/shared/ui/QuickSearchModal';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'EN',
    setLanguage: () => {},
  }),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesPage: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: (url: string) => url,
}));

describe('QuickSearchModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    state.push.mockReset();
    onClose.mockReset();
  });

  it('renders nothing when closed', () => {
    render(<QuickSearchModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders input when open', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to /search on empty submit', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(state.push).toHaveBeenCalledWith(ROUTES.SEARCH);
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to /search?keyword= on keyword submit', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'naruto' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(state.push).toHaveBeenCalledWith('/search?keyword=naruto');
    expect(onClose).toHaveBeenCalled();
  });

  it('trims whitespace from keyword on submit', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  one piece  ' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(state.push).toHaveBeenCalledWith('/search?keyword=one%20piece');
  });

  it('shows quick_search_placeholder text', () => {
    render(<QuickSearchModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('quick_search_placeholder')).toBeInTheDocument();
  });
});
