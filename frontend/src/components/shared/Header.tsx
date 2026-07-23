// components/shared/Header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LogIn, LogOut, LayoutDashboard, Menu, Globe } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useLanguage } from "@/modules/language/LanguageContext";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { toast } from "sonner";

const STAFF_ROLES = new Set(["superadmin", "admin", "employee"]);

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(role ?? "");
}

type HeaderProps = {
  onMenuClick: () => void;
  onLoginClick: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onLoginClick,
}) => {
  const { user, profile, signOut, role } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const bounceClick = {
    whileTap: { scale: 0.92 },
    whileHover: { scale: 1.05 },
  };

  const toggleLanguage = () => {
    const nextLang = language === "VI" ? "EN" : "VI";
    setLanguage(nextLang);
    toast.success(nextLang === "VI" ? "Đã chuyển sang Tiếng Việt" : "Switched to English");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        <motion.button
          {...bounceClick}
          onClick={onMenuClick}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
        >
          <Menu size={22} />
        </motion.button>

        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer outline-none"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
            L
          </div>
          <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-800 dark:text-white">
            Light<span className="text-primary">Story</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Language Switcher */}
        <motion.button
          {...bounceClick}
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
          title={t("language")}
        >
          <Globe size={14} className="text-primary" />
          <span>{language}</span>
        </motion.button>

        {/* Notification Bell with unread dot & dropdown */}
        <NotificationBell />

        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            {isStaffRole(role) && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <LayoutDashboard size={16} />
                <span className="hidden lg:block">{t("admin_dashboard")}</span>
              </Link>
            )}
            <div className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 max-w-30">
                  {profile?.full_name || user.email?.split("@")[0]}
                </div>
                <div className="text-[11px] font-black text-primary uppercase tracking-wider">
                  {role}
                </div>
              </div>
              <img
                src={
                  profile?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${profile?.full_name || "User"}&background=random`
                }
                alt="Avatar"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-cover"
              />
              <motion.button
                {...bounceClick}
                onClick={() => {
                  signOut();
                  toast.success("Đã đăng xuất thành công");
                }}
                className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                title={t("logout")}
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.button
            {...bounceClick}
            onClick={onLoginClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-full font-bold text-sm shadow-md shadow-blue-500/20 dark:shadow-indigo-900/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <LogIn size={18} />
            <span className="hidden sm:inline">{t("login")}</span>
          </motion.button>
        )}
      </div>
    </nav>
  );
};
