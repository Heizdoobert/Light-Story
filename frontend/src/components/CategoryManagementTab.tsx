import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupabaseTaxonomyRepository } from '../infrastructure/repositories/SupabaseTaxonomyRepository';
import { supabase } from '../core/supabase';
import { getErrorMessage } from '../lib/errorUtils';
import { toast } from 'sonner';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../lib/dbChangeToast';

const taxonomyRepo = new SupabaseTaxonomyRepository();

export const CategoryManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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
            disabled={createMutation.isPending || !name.trim()}
            className="w-full rounded-xl bg-slate-900 dark:bg-primary text-white py-3 font-bold disabled:opacity-50"
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
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{category.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{category.description || 'No description available.'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{linkedCounts.get(category.id) ?? 0} stories</span>
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
