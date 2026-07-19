import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComicManagementTab } from './ComicManagementTab';

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ role: 'admin', user: { id: 'u1' } }),
}));

vi.mock('@/services/comicCms.service', () => ({
  fetchComicCatalog: vi.fn().mockResolvedValue([]),
  loadComicCatalog: vi.fn(() => []),
  loadComicDraft: vi.fn(() => null),
  loadComicRecord: vi.fn(() => null),
  clearComicDraft: vi.fn(),
  saveComicDraft: vi.fn(),
  saveComicModerationState: vi.fn(),
  listComicModerationState: vi.fn(() => ({ keywords: ['spoiler'], reportedComments: [] })),
  proxiedR2ImageUrl: vi.fn((url: string) => url),
}));

vi.mock('@/services/comic.service', () => ({
  uploadComicCover: vi.fn(),
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    restore: vi.fn(() => null),
    clear: vi.fn(),
    lastSavedTime: 0,
  }),
}));

describe('ComicManagementTab - Create Comic Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all four tabs', () => {
    render(<ComicManagementTab />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent('Catalog');
    expect(tabs[1]).toHaveTextContent('Edit / Create');
    expect(tabs[2]).toHaveTextContent('Chapters & Assets');
    expect(tabs[3]).toHaveTextContent('Comments & Reports');
  });

  it('renders Create New Comic button in tab bar', () => {
    render(<ComicManagementTab />);
    const createBtn = screen.getByRole('button', { name: /create new comic/i });
    expect(createBtn).toBeInTheDocument();
  });

  it('Create New Comic button switches to editor tab with blank form', async () => {
    render(<ComicManagementTab />);

    fireEvent.click(screen.getByRole('button', { name: /create new comic/i }));

    await waitFor(() => {
      const editorTab = screen.getByRole('tab', { name: /edit \/ create/i });
      expect(editorTab).toHaveAttribute('aria-selected', 'true');
    });

    const titleInput = screen.getByPlaceholderText(/comic title/i);
    expect(titleInput).toHaveValue('');

    const authorInput = screen.getByPlaceholderText(/author/i);
    expect(authorInput).toHaveValue('');
  });

  it('Catalog tab is selected by default', () => {
    render(<ComicManagementTab />);
    const catalogTab = screen.getByRole('tab', { name: /catalog/i });
    expect(catalogTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders stats header with comic counts', () => {
    render(<ComicManagementTab />);
    expect(screen.getByText('Comic Management CMS')).toBeInTheDocument();
    expect(screen.getByText('Comics')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
    const publishedElements = screen.getAllByText('Published');
    expect(publishedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('Chapters tab shows comic selector dropdown', async () => {
    render(<ComicManagementTab />);

    fireEvent.click(screen.getByRole('tab', { name: /chapters & assets/i }));

    await waitFor(() => {
      expect(screen.getByText('Target comic')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('');
  });
});
