"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Moon, Sun, Globe, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
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
import { getAdminMenuItems } from "@/lib/admin/admin-navigation";

const bounceClick = { whileTap: { scale: 0.92 }, whileHover: { scale: 1.05 } };

export function AdminSidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

  const menuItems = getAdminMenuItems(t);
  const visibleItems = menuItems.filter((item) => {
    if (!item.roles.includes(role as (typeof item.roles)[number])) return false;
    if (item.id === "categories") return isCategoryMenuVisibleForRole(control, role);
    return true;
  });

  const toggleLanguage = () => {
    setLanguage(language === "VI" ? "EN" : "VI");
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white min-h-screen p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <Link href={ROUTES.HOME} className="flex items-center justify-between px-3 py-2 group" title={t("admin_back_to_home")}>
          <div className="flex items-center space-x-2">
            <span className="font-black text-xl text-orange-500 tracking-tight">LIGHTSTORY</span>
            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase">
              ADMIN
            </span>
          </div>
          <Home size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
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
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-400 dark:text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <motion.button
            {...bounceClick}
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-500 dark:hover:bg-primary hover:text-white transition-all text-xs font-semibold cursor-pointer"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} className="text-[#39ff14]" />}
            {theme === "light" ? "Dark" : "Light"}
          </motion.button>
          <motion.button
            {...bounceClick}
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-500 dark:hover:bg-primary hover:text-white transition-all text-xs font-semibold cursor-pointer"
          >
            <Globe size={14} className="text-orange-500" />
            {language === "VI" ? "EN" : "VI"}
          </motion.button>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          <p className="font-semibold text-slate-600 dark:text-slate-300">LightStory Admin v2.0</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Connected to Supabase & R2</p>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
