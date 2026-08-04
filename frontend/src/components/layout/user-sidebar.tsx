"use client";

import Link from 'next/link';
import { User, Bookmark, History, Settings } from 'lucide-react';

const USER_NAV_ITEMS = [
  { label: 'Trang cá nhân', href: '/dashboard', icon: User },
  { label: 'Truyện theo dõi', href: '/bookmarks', icon: Bookmark },
  { label: 'Lịch sử đọc', href: '/history', icon: History },
  { label: 'Cài đặt tài khoản', href: '/profile', icon: Settings },
];

export function UserSidebar() {
  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4 hidden md:block">
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Tài khoản</h2>
      <nav className="space-y-1">
        {USER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
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
