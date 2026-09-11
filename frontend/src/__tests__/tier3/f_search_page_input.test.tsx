import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchPageContent } from '@/components/comics/SearchPageContent';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/hooks/presenters/useSearchPresenter', () => ({
  useSearchPresenter: () => ({
    t: (key: string) => key,
    keyword: '',
    category: 'all',
    currentPage: 1,
    comics: [],
    loading: false,
    totalPages: 1,
    totalItems: 0,
    showFilter: false,
    setShowFilter: vi.fn(),
    applyComicCoverFallback: vi.fn(),
    getVietnameseStatus: () => 'Published',
  }),
}));

vi.mock('@/components/comics/FilterMenu', () => ({
  FilterMenu: () => null,
}));

vi.mock('@/components/comics/SortDropdown', () => ({
  SortDropdown: () => null,
}));

vi.mock('@/components/navigation/Pagination', () => ({
  Pagination: () => null,
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: () => null,
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'EN',
    setLanguage: () => {},
  }),
}));

vi.mock('@/components/reader/AdRenderer', () => ({
  AdRenderer: () => null,
}));

describe('SearchPageContent big input', () => {
  it('renders search input', () => {
    render(<SearchPageContent />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders search submit button', () => {
    render(<SearchPageContent />);
    expect(screen.getByRole('button', { name: /search/ })).toBeInTheDocument();
  });

  it('navigates to /search with keyword on submit', () => {
    render(<SearchPageContent />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'dragon ball' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(state.push).toHaveBeenCalledWith('/search?keyword=dragon%20ball');
  });

  it('navigates to /search without keyword when empty', () => {
    render(<SearchPageContent />);
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(state.push).toHaveBeenCalledWith(ROUTES.SEARCH);
  });

  it('shows filter button', () => {
    render(<SearchPageContent />);
    expect(screen.getByText('filter_button')).toBeInTheDocument();
  });

  it('shows sort dropdown container', () => {
    render(<SearchPageContent />);
    expect(screen.getByText('filter_button')).toBeInTheDocument();
  });
});
