/*
  App.tsx - Hardened Router & Code Splitting
  Implements Suspense for light client bundle and Error Boundaries.
*/
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './modules/auth/AuthContext';
import { ThemeProvider } from './modules/theme/ThemeContext';
import { RoleProtectedRoute } from './shared/components/RoleProtectedRoute';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// Lazy load heavy modules to keep client bundle lightweight
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(m => ({ default: m.ReaderPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Global Error Boundary Fallback
const ErrorFallback = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center p-6">
    <h1 className="text-4xl font-black mb-4">Something went wrong.</h1>
    <p className="text-slate-500 mb-6">The system encountered a critical error. Please refresh the page.</p>
    <button onClick={() => window.location.reload()} className="btn-primary px-8 py-3">Reload System</button>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors closeButton />
              <Suspense fallback={
                <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              }>
                <Routes>
                  {/* Client Portal */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/story/:storyId/chapter/:chapterId" element={<ReaderPage />} />
                  
                  {/* Admin Portal (Code-Split & Protected) */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
                        <AdminDashboard />
                      </RoleProtectedRoute>
                    } 
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
