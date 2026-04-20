import React from 'react';

type StatusErrorPageProps = {
  statusCode: number;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  showReload?: boolean;
};

export const StatusErrorPage: React.FC<StatusErrorPageProps> = ({
  statusCode,
  title,
  message,
  actionLabel = 'Back To Home',
  actionHref = '/',
  showReload = false,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Error {statusCode}</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{message}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={actionHref}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            {actionLabel}
          </a>
          {showReload && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reload
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
