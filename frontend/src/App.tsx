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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const BadRequestPage = lazy(() => import('./pages/BadRequestPage').then(m => ({ default: m.BadRequestPage })));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })));
const ServiceUnavailablePage = lazy(() => import('./pages/ServiceUnavailablePage').then(m => ({ default: m.ServiceUnavailablePage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

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
                  <Route path="/" element={<HomePage />} />
                  <Route path="/story/:storyId/chapter/:chapterId" element={<ReaderPage />} />
                  <Route path="/400" element={<BadRequestPage />} />
                  <Route path="/401" element={<UnauthorizedPage />} />
                  <Route path="/403" element={<ForbiddenPage />} />
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="/503" element={<ServiceUnavailablePage />} />
                  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route 
                    path="/admin/*" 
                    element={
                      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
                        <AdminDashboard />
                      </RoleProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
