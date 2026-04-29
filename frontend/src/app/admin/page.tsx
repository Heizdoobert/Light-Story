'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy-load admin dashboard to prevent bloating client bundle
// Non-admin users won't download this code
const AdminDashboard = dynamic(
  () => import('./_components/AdminDashboard'),
  {
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    ),
    ssr: false, // Don't render on server; admin is client-only
  }
);

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}
