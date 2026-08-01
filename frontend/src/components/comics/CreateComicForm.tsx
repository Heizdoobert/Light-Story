"use client";

import React from "react";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { useCreateComicPresenter } from "@/hooks/presenters/useCreateComicPresenter";

export const CreateComicForm: React.FC = () => {
  const {
    title,
    setTitle,
    description,
    setDescription,
    setCover,
    previewUrl,
    loading,
    handleSubmit,
  } = useCreateComicPresenter();

  return (
    <RoleProtectedRoute allowedRoles={["superadmin", "admin", "employee"]}>
      <section className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold mb-6 text-slate-900 dark:text-white">Create Comic</h2>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</span>
            <input
              className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
            <textarea
              className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm h-32 resize-vertical focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cover Image</span>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                className="block text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700"
              />
              {previewUrl?.startsWith("blob:") && (
                <div className="w-20 h-20 rounded overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={previewUrl.startsWith("blob:") ? previewUrl : undefined} alt="cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </label>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Comic"}
            </button>
          </div>
        </form>
      </section>
    </RoleProtectedRoute>
  );
};
