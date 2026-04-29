import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupabaseTaxonomyRepository } from '@/services/repositories/SupabaseTaxonomyRepository';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/modules/auth/AuthContext';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';

const taxonomyRepo = new SupabaseTaxonomyRepository();

export const CategoryManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const { role } = useAuth();
  const canManageCategories = role === 'superadmin';

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => taxonomyRepo.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () => taxonomyRepo.createCategory({ name, description }),
    onMutate: () => {
      const toastId = startDbChangeToast(`Creating category \"${name.trim() || 'new'}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-story-links'] });
      setName('');
      setDescription('');
      resolveDbChangeToast(context?.toastId, 'Category created successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; description?: string }) =>
      taxonomyRepo.updateCategory(payload.id, { name: payload.name, description: payload.description }),
    onMutate: (payload) => {
      const toastId = startDbChangeToast(`Updating category \"${payload.name.trim() || 'category'}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      setEditName('');
      setEditDescription('');
      resolveDbChangeToast(context?.toastId, 'Category updated successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxonomyRepo.deleteCategory(id),
    onMutate: () => {
      const toastId = startDbChangeToast('Deleting category...');
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-story-links'] });
      resolveDbChangeToast(context?.toastId, 'Category deleted successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const linkQuery = useQuery({
    queryKey: ['category-story-links'],
    queryFn: async () => {
      if (!supabase) return [] as Array<{ category_id: string | null }>;
      const { data, error } = await supabase.from('stories').select('category_id');
      if (error) throw error;
      return (data ?? []) as Array<{ category_id: string | null }>;
    },
  });

  const linkedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of linkQuery.data ?? []) {
      if (!row.category_id) continue;
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
    return counts;
  }, [linkQuery.data]);

  const startEdit = (id: string, currentName: string, currentDescription: string | null | undefined) => {
    setEditingId(id);
    setEditName(currentName);
    setEditDescription(currentDescription ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Category Management</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Create and maintain story categories linked to stories.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Create Category</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={4}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold resize-none"
          />
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !canManageCategories}
            className="w-full rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 py-3 font-bold disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Category'}
          </button>
        </section>

        <section className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Category Directory</h3>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {categoriesQuery.isLoading && <p className="p-6 text-sm text-slate-500">Loading categories...</p>}
            {!categoriesQuery.isLoading && (categoriesQuery.data?.length ?? 0) === 0 && (
              <p className="p-6 text-sm text-slate-500">No categories found.</p>
            )}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(categoriesQuery.data ?? []).map((category) => (
                <li key={category.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {editingId === category.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate({ id: category.id, name: editName, description: editDescription })}
                              disabled={!canManageCategories || updateMutation.isPending || !editName.trim()}
                              className="rounded-lg bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={updateMutation.isPending}
                              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-black text-slate-900 dark:text-white">{category.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{category.description || 'No description available.'}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{linkedCounts.get(category.id) ?? 0} stories</span>
                      {editingId !== category.id && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category.id, category.name, category.description)}
                            disabled={!canManageCategories}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete category \"${category.name}\"?`)) {
                                deleteMutation.mutate(category.id);
                              }
                            }}
                            disabled={!canManageCategories || deleteMutation.isPending}
                            className="rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

