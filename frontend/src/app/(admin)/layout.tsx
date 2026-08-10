'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/features/use-user';
import { ROUTES } from '@/lib/constants/routes';

export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  const { isStaff, isLoading } = useUser();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-semibold animate-pulse">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // ponytail: client-side fallback when middleware didn't redirect — keep inline (SSR-safe);
  // middleware.ts:107 redirects to ROUTES.ERROR.FORBIDDEN for the canonical page.
  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-rose-500">403 - Quyền Truy Cập Bị Từ Chối</h1>
        <p className="text-sm text-slate-400">Bạn không có quyền truy cập trang quản trị hệ thống.</p>
        <Link
          href={ROUTES.HOME}
          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-md"
        >
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  // Every admin route now lands on the tabbed AdminDashboard, which renders
  // its own sidebar + topbar — the old route-based AdminSidebar shell is gone.
  return <>{children}</>;
}
