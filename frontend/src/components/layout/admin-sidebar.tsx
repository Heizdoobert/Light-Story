"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Layers,
  Tags,
  Users,
  Megaphone,
  Settings,
  ShieldAlert,
  Home,
} from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { label: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Thống kê & R2", href: "/admin/analytics", icon: BarChart3 },
  { label: "Quản lý Truyện", href: "/admin/comics", icon: BookOpen },
  { label: "Quản lý Chương", href: "/admin/chapters", icon: Layers },
  { label: "Thể loại", href: "/admin/categories", icon: Tags },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Quảng cáo", href: "/admin/ads", icon: Megaphone },
  { label: "Cài đặt", href: "/admin/settings", icon: Settings },
  { label: "Audit Log", href: "/admin/audit", icon: ShieldAlert },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white min-h-screen p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <Link href="/" className="flex items-center justify-between px-3 py-2 group" title="Về trang chủ">
          <div className="flex items-center space-x-2">
            <span className="font-black text-xl text-orange-500 tracking-tight">LIGHTSTORY</span>
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase">
              ADMIN
            </span>
          </div>
          <Home size={16} className="text-slate-500 group-hover:text-white transition-colors" />
        </Link>
        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">LightStory Admin v2.0</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Connected to Supabase & R2</p>
      </div>
    </aside>
  );
}

export default AdminSidebar;
