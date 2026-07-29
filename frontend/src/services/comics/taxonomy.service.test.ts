import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('taxonomy.service', () => {
  it('fetchCategories', async () => {
    mockGet.mockResolvedValue([{ id: 'c1', name: 'Action' }]);
    const { fetchCategories } = await import('./taxonomy.service');
    expect(await fetchCategories()).toEqual([{ id: 'c1', name: 'Action' }]);
    expect(mockGet).toHaveBeenCalledWith('/api/admin/taxonomy?entity=category');
  });

  it('fetchCategoryById finds', async () => {
    mockGet.mockResolvedValue([{ id: 'c1', name: 'Action' }]);
    const { fetchCategoryById } = await import('./taxonomy.service');
    expect(await fetchCategoryById('c1')).toEqual({ id: 'c1', name: 'Action' });
  });

  it('fetchCategoryById null when not found', async () => {
    mockGet.mockResolvedValue([]);
    const { fetchCategoryById } = await import('./taxonomy.service');
    expect(await fetchCategoryById('c1')).toBeNull();
  });

  it('createCategory', async () => {
    const { createCategory } = await import('./taxonomy.service');
    await createCategory({ name: 'New' });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'category', action: 'create', payload: { name: 'New' } });
  });

  it('updateCategory', async () => {
    const { updateCategory } = await import('./taxonomy.service');
    await updateCategory('c1', { name: 'Updated' });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'category', action: 'update', id: 'c1', payload: { name: 'Updated' } });
  });

  it('deleteCategory', async () => {
    const { deleteCategory } = await import('./taxonomy.service');
    await deleteCategory('c1');
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'category', action: 'delete', id: 'c1' });
  });

  it('fetchAuthors', async () => {
    mockGet.mockResolvedValue([{ id: 'a1' }]);
    const { fetchAuthors } = await import('./taxonomy.service');
    expect(await fetchAuthors()).toEqual([{ id: 'a1' }]);
  });

  it('createAuthor', async () => {
    const { createAuthor } = await import('./taxonomy.service');
    await createAuthor({ name: 'Author' });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'author', action: 'create', payload: { name: 'Author' } });
  });

  it('updateAuthor', async () => {
    const { updateAuthor } = await import('./taxonomy.service');
    await updateAuthor('a1', { name: 'Updated' });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'author', action: 'update', id: 'a1', payload: { name: 'Updated' } });
  });

  it('deleteAuthor', async () => {
    const { deleteAuthor } = await import('./taxonomy.service');
    await deleteAuthor('a1');
    expect(mockPost).toHaveBeenCalledWith('/api/admin/taxonomy', { entity: 'author', action: 'delete', id: 'a1' });
  });

  it('fetchTranslators', async () => {
    mockGet.mockResolvedValue([{ id: 't1', name: 'Trans' }]);
    const { fetchTranslators } = await import('./taxonomy.service');
    expect(await fetchTranslators()).toEqual([{ id: 't1', name: 'Trans' }]);
  });

  it('createTranslator', async () => {
    const { createTranslator } = await import('./taxonomy.service');
    await createTranslator({ name: 'T1', contact: '@' });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/translators', { name: 'T1', contact: '@' });
  });

  it('updateTranslator', async () => {
    const { updateTranslator } = await import('./taxonomy.service');
    await updateTranslator('t1', { name: 'T2' });
    expect(mockPatch).toHaveBeenCalledWith('/api/admin/translators/t1', { name: 'T2' });
  });

  it('deleteTranslator', async () => {
    const { deleteTranslator } = await import('./taxonomy.service');
    await deleteTranslator('t1');
    expect(mockDelete).toHaveBeenCalledWith('/api/admin/translators/t1');
  });
});