"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import {
  DEFAULT_SIDEBAR_CONTROL,
  SIDEBAR_CONTROL_KEY,
  isCategoryMenuVisibleForRole,
  isSidebarEnabledForRole,
  parseSidebarControl,
  type SidebarControl,
} from "@/lib/admin/sidebar-settings";
import { ADMIN_MENU_ITEMS } from "@/lib/admin/admin-navigation";
import { Home } from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const [control, setControl] = useState<SidebarControl>(DEFAULT_SIDEBAR_CONTROL);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", SIDEBAR_CONTROL_KEY)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data) setControl(parseSidebarControl(data.value));
        },
        () => {},
      );
  }, []);

  if (!isSidebarEnabledForRole(control, role)) return null;

  const visibleItems = ADMIN_MENU_ITEMS.filter((item) => {
    if (!item.roles.includes(role as (typeof item.roles)[number])) return false;
    if (item.id === "categories") return isCategoryMenuVisibleForRole(control, role);
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white min-h-screen p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <Link href={ROUTES.HOME} className="flex items-center justify-between px-3 py-2 group" title="Về trang chủ">
          <div className="flex items-center space-x-2">
            <span className="font-black text-xl text-orange-500 tracking-tight">LIGHTSTORY</span>
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase">
              ADMIN
            </span>
          </div>
          <Home size={16} className="text-slate-500 group-hover:text-white transition-colors" />
        </Link>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
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
