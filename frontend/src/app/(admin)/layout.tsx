'use client';

import { useUser } from '@/lib/hooks/use-user';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  const { isStaff, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-semibold animate-pulse">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-rose-500">403 - Quyền Truy Cập Bị Từ Chối</h1>
        <p className="text-sm text-slate-400">Bạn không có quyền truy cập trang quản trị hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
