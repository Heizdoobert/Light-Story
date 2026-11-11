"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Menu,
  ExternalLink,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Layers,
  Tags,
  Settings,
  ShieldAlert,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { ROUTES } from "@/lib/constants/routes";
import { getFallbackAvatar, proxyAvatarUrl } from "@/lib/security/security-utils";

type AdminHeaderProps = {
  onToggleMobileSidebar?: () => void;
};

// Core workflow tabs for swift switching in the top navigation strip
const ADMIN_QUICK_TABS = [
  {
    id: "dashboard",
    labelVi: "Tổng quan",
    labelEn: "Dashboard",
    href: ROUTES.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "comics",
    labelVi: "Truyện",
    labelEn: "Comics",
    href: ROUTES.ADMIN.COMICS,
    icon: BookOpen,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "chapters",
    labelVi: "Chương",
    labelEn: "Chapters",
    href: ROUTES.ADMIN.CHAPTERS,
    icon: Layers,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "categories",
    labelVi: "Thể loại",
    labelEn: "Categories",
    href: ROUTES.ADMIN.CATEGORIES,
    icon: Tags,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "tags",
    labelVi: "Thẻ Tag",
    labelEn: "Tags",
    href: ROUTES.ADMIN.TAGS,
    icon: Tags,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "analytics",
    labelVi: "Thống kê & R2",
    labelEn: "Analytics & R2",
    href: ROUTES.ADMIN.ANALYTICS,
    icon: BarChart3,
    roles: ["superadmin"],
  },
  {
    id: "users",
    labelVi: "Người dùng",
    labelEn: "Users",
    href: ROUTES.ADMIN.USERS,
    icon: Users,
    roles: ["superadmin"],
  },
  {
    id: "settings",
    labelVi: "Cài đặt",
    labelEn: "Settings",
    href: ROUTES.ADMIN.SETTINGS,
    icon: Settings,
    roles: ["superadmin"],
  },
  {
    id: "audit",
    labelVi: "Audit Log",
    labelEn: "Audit Log",
    href: ROUTES.ADMIN.AUDIT,
    icon: ShieldAlert,
    roles: ["superadmin"],
  },
];

export function AdminHeader({ onToggleMobileSidebar }: AdminHeaderProps) {
  const pathname = usePathname() || "";
  const { user, profile, role } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const toggleLanguage = () => {
    setLanguage(language === "VI" ? "EN" : "VI");
  };

  // Find active tab info for breadcrumb
  const currentTab = ADMIN_QUICK_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );

  const isTabActive = (href: string) => {
    if (href === ROUTES.ADMIN.DASHBOARD || href === ROUTES.ADMIN.ROOT) {
      return pathname === ROUTES.ADMIN.DASHBOARD || pathname === ROUTES.ADMIN.ROOT;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const allowedTabs = ADMIN_QUICK_TABS.filter((tab) =>
    tab.roles.includes((role || "employee") as (typeof tab.roles)[number]),
  );

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Top Bar: Mobile Hamburger + Breadcrumb + User / Quick Actions */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
              aria-label="Mở menu quản trị"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            <Link
              href={ROUTES.ADMIN.DASHBOARD}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium"
            >
              Admin
            </Link>
            <ChevronRight size={13} className="text-slate-400 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white truncate">
              {currentTab
                ? language === "VI"
                  ? currentTab.labelVi
                  : currentTab.labelEn
                : language === "VI"
                ? "Bảng điều khiển"
                : "Console"}
            </span>
          </nav>
        </div>

        {/* Right: Quick Portal Link, Theme, Language & Admin Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Public Portal Link */}
          <Link
            href={ROUTES.HOME}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-orange-500 hover:text-white text-slate-600 dark:text-slate-300 transition-all text-xs font-semibold cursor-pointer"
            title={t("admin_back_to_home")}
          >
            <ExternalLink size={14} />
            <span>{language === "VI" ? "Xem trang đọc" : "Public Site"}</span>
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
          >
            <Globe size={13} className="text-orange-500" />
            <span>{language}</span>
          </button>

          {/* Admin User Badge */}
          {user && (
            <Link
              href={ROUTES.ADMIN.PROFILE}
              className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 group"
            >
              <Image
                src={proxyAvatarUrl(profile?.avatar_url) || getFallbackAvatar(profile?.full_name || "Admin")}
                alt="Admin Avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-orange-500 object-cover shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getFallbackAvatar(profile?.full_name || "Admin");
                }}
              />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1 max-w-[110px] group-hover:text-orange-500 transition-colors">
                  {profile?.full_name || user.email?.split("@")[0]}
                </span>
                <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-wider leading-none">
                  {role}
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Bar: Horizontal Quick Tabs Strip */}
      <nav aria-label="QuickTabs" className="px-4 sm:px-6 py-2 bg-slate-50/70 dark:bg-slate-900/60 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {allowedTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.href);

            return (
              <Link
                key={`tab-${tab.id}`}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  active
                    ? "bg-orange-500 text-white font-bold shadow-xs shadow-orange-500/25"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={14} className={active ? "text-white" : "text-slate-400"} />
                <span>{language === "VI" ? tab.labelVi : tab.labelEn}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

export default AdminHeader;
