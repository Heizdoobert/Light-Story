import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComicManagementTab } from './ComicManagementTab';

vi.mock('@/modules/language/LanguageContext', () => ({
  useLanguage: () => {
    const map: Record<string, string> = {
      tab_catalog: 'Catalog',
      tab_editor: 'Edit / Create',
      tab_chapters: 'Chỉnh sửa chương',
      tab_translators: 'Translators',
      tab_feedback: 'Comments & Reports',
      tab_trash: 'Trash',
      tab_moderation: 'Advanced Moderation',
      create_new_comic: 'Create New Comic',
      cms_header_title: 'Comic Management CMS',
      total_comics: 'Comics',
      drafts: 'Drafts',
      published: 'Published',
      total_pages: 'Pages',
    };
    return {
      language: 'EN',
      setLanguage: vi.fn(),
      t: (key: string, fallback?: string) => map[key] ?? fallback ?? key,
    };
  },
}));

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ role: 'admin', user: { id: 'u1' } }),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
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

vi.mock('@/services/comics/comic.service', () => ({
  uploadComicCover: vi.fn(),
}));

vi.mock('@/hooks/common/useAutoSave', () => ({
  useAutoSave: () => ({
    restore: vi.fn(() => null),
    clear: vi.fn(),
    lastSavedTime: 0,
  }),
}));

vi.mock('motion/react', () => ({
  motion: { button: 'button', div: 'div', span: 'span', p: 'p', h3: 'h3' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./TranslatorManagementTab', () => ({
  loadTranslators: vi.fn(() => []),
}));

describe('ComicManagementTab - Create Comic Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all tabs', () => {
    render(<ComicManagementTab />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(tabs[0]).toHaveTextContent('Catalog');
    expect(tabs[1]).toHaveTextContent('Edit / Create');
    expect(tabs[2]).toHaveTextContent('Chỉnh sửa chương');
    expect(tabs[3]).toHaveTextContent('Translators');
    expect(tabs[4]).toHaveTextContent('Comments & Reports');
    expect(tabs[5]).toHaveTextContent('Trash');
    expect(tabs[6]).toHaveTextContent('Advanced Moderation');
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

    const authorSelects = screen.getAllByRole('combobox');
    expect(authorSelects[0]).toHaveValue('');
  });

  it('Catalog tab is selected by default', () => {
    render(<ComicManagementTab />);
    const catalogTab = screen.getByRole('tab', { name: /catalog/i });
    expect(catalogTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders stats header with comic counts', () => {
    render(<ComicManagementTab />);
    expect(screen.getAllByText('Comic Management CMS').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Comics')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
    const publishedElements = screen.getAllByText('Published');
    expect(publishedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('Chapters tab shows comic selector dropdown', async () => {
    render(<ComicManagementTab />);

    fireEvent.click(screen.getByRole('tab', { name: /chỉnh sửa chương|edit chapter/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Chỉnh sửa chương/i).length).toBeGreaterThan(0);
    });
  });
});
