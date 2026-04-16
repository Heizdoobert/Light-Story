import React, { useState, useEffect, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (e: ErrorEvent) => {
      setHasError(true);
      setError(e.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center p-6">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          The application encountered an unexpected error. This might be due to a configuration issue or a temporary service disruption.
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl mb-8 w-full max-w-lg overflow-auto">
          <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
            {error?.message || 'Unknown error'}
          </code>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Reload Application
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
