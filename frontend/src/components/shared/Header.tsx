// components/shared/Header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LogIn, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
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

  const bounceClick = {
    whileTap: { scale: 0.92 },
    whileHover: { scale: 1.05 },
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        <motion.button
          {...bounceClick}
          onClick={onMenuClick}
          className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-primary hover:text-white transition-colors"
        >
          <Menu size={22} />
        </motion.button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex w-10 h-10 bg-linear-to-br from-primary to-primary/80 rounded-2xl items-center justify-center text-white font-black shadow-lg shadow-primary/20">
            L
          </div>
          <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-800 dark:text-white">
            Light<span className="text-primary">Story</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            {isStaffRole(role) && (
              <Link href="/admin">
                <motion.button
                  {...bounceClick}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden lg:block">Quản trị</span>
                </motion.button>
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
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.button
            {...bounceClick}
            onClick={onLoginClick}
            className="flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
          >
            <LogIn size={18} />
            <span className="hidden sm:inline">Đăng nhập</span>
          </motion.button>
        )}
      </div>
    </nav>
  );
};
