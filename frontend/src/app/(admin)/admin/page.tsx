'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { RoleProtectedRoute } from '@/components/shared/auth/RoleProtectedRoute';
import { LoadingScreen } from '@/components/shared/ui/LoadingScreen';

// Lazy-load admin dashboard to prevent bloating client bundle
// Non-admin users won't download this code
const AdminDashboard = dynamic(
  () => import('./_components/dashboard/AdminDashboard'),
  {
    loading: () => <LoadingScreen />,
    ssr: false, // Don't render on server; admin is client-only
  }
);

export default function AdminPage() {
  return (
    <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
      <Suspense
        fallback={<LoadingScreen />}
      >
        <AdminDashboard />
      </Suspense>
    </RoleProtectedRoute>
  );
}
