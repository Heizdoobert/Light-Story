"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Moon,
  Sun,
  Globe,
  Home,
  X,
  ShieldCheck,
  LayoutDashboard,
  FolderKanban,
  Sliders,
} from "lucide-react";
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
import { getAdminMenuItems, AdminMenuItem } from "@/lib/admin/admin-navigation";

const bounceClick = { whileTap: { scale: 0.94 }, whileHover: { scale: 1.02 } };

type AdminSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

// Semantic grouping of admin navigation items
const NAV_GROUPS: {
  id: "overview" | "content" | "system";
  titleVi: string;
  titleEn: string;
  itemIds: string[];
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "overview",
    titleVi: "Tổng quan",
    titleEn: "Overview",
    itemIds: ["dashboard", "analytics"],
    icon: LayoutDashboard,
  },
  {
    id: "content",
    titleVi: "Quản lý nội dung",
    titleEn: "Content Management",
    itemIds: ["comics", "chapters", "categories", "authors", "genres", "tags", "descriptions"],
    icon: FolderKanban,
  },
  {
    id: "system",
    titleVi: "Hệ thống & Vận hành",
    titleEn: "System & Ops",
    itemIds: ["users", "ads", "settings", "audit_logs", "profile"],
    icon: Sliders,
  },
];

export function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname() || "";
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

  const isItemActive = (href: string) => {
    if (href === ROUTES.ADMIN.DASHBOARD || href === ROUTES.ADMIN.ROOT) {
      return pathname === ROUTES.ADMIN.DASHBOARD || pathname === ROUTES.ADMIN.ROOT;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-5">
        {/* Brand & Home Navigation */}
        <div className="flex items-center justify-between px-2 py-1">
          <Link
            href={ROUTES.ADMIN.DASHBOARD}
            className="flex items-center gap-2.5 group"
            onClick={onClose}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-orange-500/25">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                LIGHT<span className="text-orange-500">STORY</span>
              </span>
              <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-wider mt-0.5">
                ADMIN CONSOLE
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={ROUTES.HOME}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t("admin_back_to_home")}
            >
              <Home size={16} />
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {NAV_GROUPS.map((group) => {
            const groupItems = visibleItems.filter((item) => group.itemIds.includes(item.id));
            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <span>{language === "VI" ? group.titleVi : group.titleEn}</span>
                </div>

                <div className="space-y-0.5">
                  {groupItems.map((item: AdminMenuItem) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                          active
                            ? "bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/25"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={16}
                            className={`shrink-0 transition-colors ${
                              active ? "text-white" : "text-slate-400 dark:text-slate-400 group-hover:text-orange-500"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Theme, Language, System Info */}
      <div className="space-y-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <motion.button
            {...bounceClick}
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
            <span>{theme === "light" ? "Tối" : "Sáng"}</span>
          </motion.button>
          <motion.button
            {...bounceClick}
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all text-xs font-semibold cursor-pointer"
          >
            <Globe size={14} className="text-orange-500" />
            <span>{language === "VI" ? "EN" : "VI"}</span>
          </motion.button>
        </div>

        {/* System Status Pill */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 leading-tight">LightStory Admin</p>
              <p className="text-[10px] text-slate-400">R2 & Supabase Active</p>
            </div>
          </div>
          <ShieldCheck size={15} className="text-emerald-500" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white min-h-screen p-4 hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-screen transition-colors z-30">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 z-50 flex flex-col justify-between lg:hidden shadow-2xl"
            >
              {renderNavContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default AdminSidebar;
