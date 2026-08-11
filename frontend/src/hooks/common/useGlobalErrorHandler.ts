'use client';

import { useEffect } from 'react';

type ErrorHandler = (error: Error) => void;

let globalErrorHandler: ErrorHandler | null = null;

/**
 * Hook to catch unhandled promise rejections and async errors.
 * Logs them to console and notifies UI via error callback.
 */
export const useGlobalErrorHandler = (onError?: ErrorHandler) => {
  useEffect(() => {
    globalErrorHandler = onError || ((error: Error) => {
      console.error('Unhandled error:', error);
    });

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (globalErrorHandler) {
        globalErrorHandler(new Error(String(event.reason)));
      }
      // Prevent default browser behavior
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      if (globalErrorHandler) {
        globalErrorHandler(event.error || new Error(event.message));
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      globalErrorHandler = null;
    };
  }, [onError]);
};

/**
 * Check if error is a Supabase connection error.
 */
export const isSupabaseConnectionError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout')
    );
  }
  return false;
};

// ponytail: single canonical implementation in lib/utils/error-utils — re-exported
// here so the hooks/common barrel surface stays stable.
export { getErrorMessage } from '@/lib/utils/error-utils';
