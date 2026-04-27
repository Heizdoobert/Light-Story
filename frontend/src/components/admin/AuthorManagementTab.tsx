import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupabaseTaxonomyRepository } from '../../infrastructure/repositories/SupabaseTaxonomyRepository';
import { supabase } from '../../core/supabase';
import { useAuth } from '../../modules/auth/AuthContext';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../../lib/dbChangeToast';

const taxonomyRepo = new SupabaseTaxonomyRepository();

export const AuthorManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const { role } = useAuth();
  const canManageAuthors = role === 'superadmin';

  const authorsQuery = useQuery({
    queryKey: ['authors'],
    queryFn: () => taxonomyRepo.getAuthors(),
  });

  const createMutation = useMutation({
    mutationFn: () => taxonomyRepo.createAuthor({ name, bio }),
    onMutate: () => {
      const toastId = startDbChangeToast(`Creating author \"${name.trim() || 'new'}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      queryClient.invalidateQueries({ queryKey: ['author-story-links'] });
      setName('');
      setBio('');
      resolveDbChangeToast(context?.toastId, 'Author created successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; bio?: string }) =>
      taxonomyRepo.updateAuthor(payload.id, { name: payload.name, bio: payload.bio }),
    onMutate: (payload) => {
      const toastId = startDbChangeToast(`Updating author \"${payload.name.trim() || 'author'}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      setEditingId(null);
      setEditName('');
      setEditBio('');
      resolveDbChangeToast(context?.toastId, 'Author updated successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxonomyRepo.deleteAuthor(id),
    onMutate: () => {
      const toastId = startDbChangeToast('Deleting author...');
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      queryClient.invalidateQueries({ queryKey: ['author-story-links'] });
      resolveDbChangeToast(context?.toastId, 'Author deleted successfully');
    },
    onError: (error, _variables, context) => rejectDbChangeToast(context?.toastId, error),
  });

  const linkQuery = useQuery({
    queryKey: ['author-story-links'],
    queryFn: async () => {
      if (!supabase) return [] as Array<{ author_id: string | null }>;
      const { data, error } = await supabase.from('stories').select('author_id');
      if (error) throw error;
      return (data ?? []) as Array<{ author_id: string | null }>;
    },
  });

  const linkedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of linkQuery.data ?? []) {
      if (!row.author_id) continue;
      counts.set(row.author_id, (counts.get(row.author_id) ?? 0) + 1);
    }
    return counts;
  }, [linkQuery.data]);

  const startEdit = (id: string, currentName: string, currentBio: string | null | undefined) => {
    setEditingId(id);
    setEditName(currentName);
    setEditBio(currentBio ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditBio('');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Author Management</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Create and maintain author records linked to stories.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Create Author</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Author name"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short bio (optional)"
            rows={4}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold resize-none"
          />
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !canManageAuthors}
            className="w-full rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 py-3 font-bold disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Author'}
          </button>
        </section>

        <section className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Author Directory</h3>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {authorsQuery.isLoading && <p className="p-6 text-sm text-slate-500">Loading authors...</p>}
            {!authorsQuery.isLoading && (authorsQuery.data?.length ?? 0) === 0 && (
              <p className="p-6 text-sm text-slate-500">No authors found.</p>
            )}
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(authorsQuery.data ?? []).map((author) => (
                <li key={author.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {editingId === author.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold"
                          />
                          <textarea
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate({ id: author.id, name: editName, bio: editBio })}
                              disabled={!canManageAuthors || updateMutation.isPending || !editName.trim()}
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
                          <p className="font-black text-slate-900 dark:text-white">{author.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{author.bio || 'No bio available.'}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{linkedCounts.get(author.id) ?? 0} stories</span>
                      {editingId !== author.id && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(author.id, author.name, author.bio)}
                            disabled={!canManageAuthors}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete author \"${author.name}\"?`)) {
                                deleteMutation.mutate(author.id);
                              }
                            }}
                            disabled={!canManageAuthors || deleteMutation.isPending}
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

