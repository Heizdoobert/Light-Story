"use client";

import Link from 'next/link';
import { LayoutDashboard, BookOpen, Layers, Users, ShieldAlert } from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Quản lý Truyện', href: '/admin/comics', icon: BookOpen },
  { label: 'Quản lý Chương', href: '/admin/chapters', icon: Layers },
  { label: 'Người dùng', href: '/admin/users', icon: Users },
  { label: 'Audit Log', href: '/admin/audit', icon: ShieldAlert },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <Link href="/" className="flex items-center space-x-2 px-3 py-2">
          <span className="font-black text-xl text-orange-500">LIGHTSTORY</span>
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold">ADMIN</span>
        </Link>
        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-slate-300 hover:text-white font-medium text-sm"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default AdminSidebar;
