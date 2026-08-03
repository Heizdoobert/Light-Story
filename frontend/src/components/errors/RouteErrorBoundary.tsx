'use client';

import { useEffect } from 'react';

export default function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Error</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
