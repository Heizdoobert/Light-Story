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

/**
 * Get human-readable error message for Supabase errors.
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (isSupabaseConnectionError(error)) {
      return 'Unable to connect to the server. Please check your network connection and try again.';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'The requested resource was not found.';
    }
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }
  }
  return 'An unexpected error occurred. Please try again or contact support.';
};
