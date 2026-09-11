import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Pagination } from '@/components/navigation/Pagination';
import { SortDropdown } from '@/components/comics/SortDropdown';

const routerState = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
  pathname: '/search',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerState.push }),
  useSearchParams: () => routerState.searchParams,
  usePathname: () => routerState.pathname,
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'VI',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const dict: Record<string, string> = {
        sort_by_label: 'Sắp xếp theo',
        sort_newest: 'Mới nhất',
        sort_most_viewed: 'Xem nhiều nhất',
        sort_oldest: 'Cũ nhất',
      };
      return dict[key] || key;
    },
  }),
}));

describe('Mobile Responsiveness & Accessibility Verification', () => {
  beforeEach(() => {
    routerState.push.mockReset();
    routerState.searchParams = new URLSearchParams();
    routerState.pathname = '/search';
  });

  describe('Pagination Component', () => {
    it('renders within a semantic navigation landmark', () => {
      render(<Pagination currentPage={1} totalPages={5} />);
      const nav = screen.getByRole('navigation', { name: 'Phân trang' });
      expect(nav).toBeInTheDocument();
    });

    it('sets aria-current="page" on the active page button only', () => {
      render(<Pagination currentPage={3} totalPages={5} />);
      const activeBtn = screen.getByRole('button', { name: 'Trang 3' });
      expect(activeBtn).toHaveAttribute('aria-current', 'page');

      const inactiveBtn = screen.getByRole('button', { name: 'Trang 2' });
      expect(inactiveBtn).not.toHaveAttribute('aria-current');
    });

    it('includes accessible labels and disabled states for boundary navigation', () => {
      render(<Pagination currentPage={1} totalPages={5} />);
      const firstBtn = screen.getByRole('button', { name: 'Go to first page' });
      const prevBtn = screen.getByRole('button', { name: 'Previous page' });
      expect(firstBtn).toBeDisabled();
      expect(prevBtn).toBeDisabled();

      const nextBtn = screen.getByRole('button', { name: 'Next page' });
      expect(nextBtn).not.toBeDisabled();
    });

    it('navigates to next page on click', () => {
      render(<Pagination currentPage={2} totalPages={5} />);
      const nextBtn = screen.getByRole('button', { name: 'Next page' });
      fireEvent.click(nextBtn);
      expect(routerState.push).toHaveBeenCalledWith('/search?page=3');
    });
  });

  describe('SortDropdown Component', () => {
    it('renders with listbox popup semantics and collapsed state', () => {
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'Sắp xếp theo' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens listbox and reveals options on click', async () => {
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'Sắp xếp theo' });
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const listbox = await screen.findByRole('listbox', { name: 'Sắp xếp theo' });
      expect(listbox).toBeInTheDocument();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('closes on Escape key press', async () => {
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'Sắp xếp theo' });
      fireEvent.click(trigger);

      expect(await screen.findByRole('listbox')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBeNull();
      });
    });

    it('triggers sort change and updates query parameters', async () => {
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'Sắp xếp theo' });
      fireEvent.click(trigger);

      const mostViewedOption = await screen.findByRole('option', { name: /Xem nhiều nhất/i });
      fireEvent.click(mostViewedOption);

      expect(routerState.push).toHaveBeenCalledWith('/search?sort=most_viewed');
    });
  });
});
