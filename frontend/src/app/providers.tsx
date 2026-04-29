'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { AuthProvider } from '../modules/auth/AuthContext';
import { ThemeProvider } from '../modules/theme/ThemeContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useGlobalErrorHandler, getErrorMessage } from '../hooks/useGlobalErrorHandler';

/**
 * Error handler component that displays errors via toast.
 */
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useGlobalErrorHandler((error: Error) => {
    toast.error(getErrorMessage(error), {
      duration: 5000,
      richColors: true,
    });
  });

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            gcTime: 300_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <Toaster position="top-right" richColors closeButton />
            <GlobalErrorHandler>{children}</GlobalErrorHandler>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
