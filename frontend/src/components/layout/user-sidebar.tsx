"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bookmark, History, Settings } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';

const USER_NAV_ITEMS = [
  { label: 'Trang cá nhân', href: ROUTES.USER.PROFILE, icon: User },
  { label: 'Truyện theo dõi', href: ROUTES.USER.FAVORITES, icon: Bookmark },
  { label: 'Lịch sử đọc', href: ROUTES.USER.HISTORY, icon: History },
  { label: 'Bảng điều khiển', href: ROUTES.USER.DASHBOARD, icon: Settings },
];

export function UserSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4 hidden md:block">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Tài khoản</h2>
      <nav className="space-y-1">
        {USER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
                isActive
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default UserSidebar;
