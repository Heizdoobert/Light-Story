"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { LoadingScreen } from '@/components/shared/ui/LoadingScreen';

const AdminDashboard = dynamic(
  () => import('@/components/admin/dashboard/AdminDashboard'),
  {
    loading: () => <LoadingScreen />,
    ssr: false,
  }
);

export function AdminPageClient() {
  return (
    <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
      <Suspense fallback={<LoadingScreen />}>
        <AdminDashboard />
      </Suspense>
    </RoleProtectedRoute>
  );
}
