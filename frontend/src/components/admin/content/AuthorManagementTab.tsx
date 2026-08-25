"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { createAuthor, updateAuthor, deleteAuthor } from '@/actions/taxonomy.actions';
import { createTranslator, updateTranslator, deleteTranslator } from '@/actions/translators.actions';
import { useAuthorPresenter } from '@/hooks/presenters/useAuthorPresenter';
import { useTranslatorPresenter } from '@/hooks/presenters/useTranslatorPresenter';
import { useCrudMutation } from '@/hooks/presenters/useTaxonomyCrud';
import { useAuth } from '@/context/AuthContext';

type SubTab = 'authors' | 'translators';

export const AuthorManagementTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('authors');

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Author Management</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Create and maintain author and translator records.</p>
      </header>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('authors')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'authors' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Tác giả
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('translators')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'translators' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Nhóm dịch
        </button>
      </div>

      {activeTab === 'authors' ? <AuthorsSection /> : <TranslatorsSection />}
    </div>
  );
};

const AuthorsSection: React.FC = () => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const { role } = useAuth();
  const canManageAuthors = role === 'superadmin' || role === 'admin' || role === 'employee';

  const { authorsQuery, linkedCounts } = useAuthorPresenter();

  const createMutation = useCrudMutation({
    mutationFn: () => createAuthor({ name, bio }),
    queryKeys: [['authors'], ['author-story-links']],
    successMsg: 'Author created successfully',
    actionLabel: `Creating author "${name.trim() || 'new'}"`,
    onSuccess: () => { setName(''); setBio(''); },
  });

  const updateMutation = useCrudMutation({
    mutationFn: (payload: { id: string; name: string; bio?: string }) =>
      updateAuthor({ id: payload.id, name: payload.name, bio: payload.bio }),
    queryKeys: [['authors']],
    successMsg: 'Author updated successfully',
    actionLabel: (v) => `Updating author "${v.name.trim() || 'author'}"`,
    onSuccess: () => { setEditingId(null); setEditName(''); setEditBio(''); },
  });

  const deleteMutation = useCrudMutation({
    mutationFn: (id: string) => deleteAuthor({ id }),
    queryKeys: [['authors'], ['author-story-links']],
    successMsg: 'Author deleted successfully',
    actionLabel: 'Deleting author...',
  });

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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Create Author</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Author name"
          aria-label="Author name"
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio (optional)"
          aria-label="Short bio (optional)"
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
        <div>
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
                          aria-label="Author name"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-bold"
                        />
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          rows={3}
                          aria-label="Author bio"
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
                            if (window.confirm(`Delete author "${author.name}"?`)) {
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
  );
};

const TranslatorsSection: React.FC = () => {
  const { translatorsQuery } = useTranslatorPresenter();
  const { role } = useAuth();
  const canManage = role === 'superadmin' || role === 'admin' || role === 'employee';

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formError, setFormError] = useState<string | null>(null);

  const translators = translatorsQuery.data ?? [];

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormName('');
    setFormContact('');
    setFormNotes('');
    setFormStatus('active');
    setFormError(null);
  };

  const openAddModal = () => {
    closeModal();
    setShowModal(true);
  };

  const openEditModal = (t: typeof translators[number]) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormContact(t.contact ?? '');
    setFormNotes(t.notes ?? '');
    setFormStatus(t.status);
    setFormError(null);
    setShowModal(true);
  };

  const createMutation = useCrudMutation({
    mutationFn: () => createTranslator({ name: formName.trim(), contact: formContact.trim(), notes: formNotes.trim(), status: formStatus }),
    queryKeys: [['translators']],
    successMsg: 'Translator created successfully',
    actionLabel: `Creating translator "${formName.trim()}"`,
    onSuccess: closeModal,
  });

  const updateMutation = useCrudMutation({
    mutationFn: () => updateTranslator({ id: editingId!, name: formName.trim(), contact: formContact.trim(), notes: formNotes.trim(), status: formStatus }),
    queryKeys: [['translators']],
    successMsg: 'Translator updated successfully',
    actionLabel: `Updating translator "${formName.trim()}"`,
    onSuccess: closeModal,
  });

  const deleteMutation = useCrudMutation({
    mutationFn: (id: string) => deleteTranslator({ id }),
    queryKeys: [['translators']],
    successMsg: 'Translator deleted successfully',
    actionLabel: 'Deleting translator...',
  });

  const filtered = translators.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.contact?.toLowerCase() ?? '').includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Translator name is required');
      return;
    }
    if (editingId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const mutationPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search translators..."
            aria-label="Search translators"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={!canManage}
          className="rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2.5 text-sm font-bold disabled:opacity-50 shrink-0"
        >
          Add Translator
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Translator Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {translatorsQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">Loading translators...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No translators found.</td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{t.contact || '—'}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{t.notes || '—'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          disabled={!canManage}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete translator "${t.name}"?`)) {
                              deleteMutation.mutate(t.id);
                            }
                          }}
                          disabled={!canManage || deleteMutation.isPending}
                          className="rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? 'Edit Translator' : 'Add Translator'}>
        <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {formError}
                </div>
              )}
              <div>
                <label htmlFor="translator-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
                <input
                  id="translator-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="translator-contact" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Contact</label>
                <input
                  id="translator-contact"
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="translator-status" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  id="translator-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label htmlFor="translator-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                <textarea
                  id="translator-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={mutationPending}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutationPending}
                  className="rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
