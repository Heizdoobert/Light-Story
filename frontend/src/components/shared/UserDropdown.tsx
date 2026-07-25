"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Bookmark,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useTheme } from "@/modules/theme/ThemeContext";
import { toast } from "sonner";

const STAFF_ROLES = new Set(["superadmin", "admin", "employee"]);

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(role ?? "");
}

export const UserDropdown = () => {
  const { user, profile, signOut, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateAndClose = (url: string) => {
    router.push(url);
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* NÚT TRIGGER: Hiện Avatar và Tên người dùng */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors outline-none"
      >
        {/* Ảnh Avatar */}
        <img
          src={
            profile?.avatar_url ||
            `https://ui-avatars.com/api/?name=${profile?.full_name || user.email?.split("@")[0] || "User"}&background=random`
          }
          alt="Avatar"
          className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm object-cover"
        />

        {/* Tên người dùng (Có giới hạn độ dài để không bị vỡ giao diện) */}
        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">
          {profile?.full_name || user.email?.split("@")[0]}
        </span>

        <ChevronDown
          size={14}
          className={`text-slate-500 hidden sm:block transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* MENU XỔ XUỐNG */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xl overflow-hidden py-1"
          >
            {/* Mục 0: Quản trị (Chỉ hiện nếu là Admin) */}
            {isStaffRole(role) && (
              <button
                onClick={() => navigateAndClose("/admin")}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <LayoutDashboard size={16} className="text-slate-500" /> Quản
                trị
              </button>
            )}

            {/* Mục 1: Trang cá nhân */}
            <button
              onClick={() => navigateAndClose("/profile")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <User size={16} className="text-slate-500" /> Trang cá nhân
            </button>

            {/* Mục 2: Truyện theo dõi */}
            <button
              onClick={() => navigateAndClose("/following")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Bookmark size={16} className="text-slate-500" /> Truyện theo dõi
            </button>

            {/* Mục 3: Chuyển theme */}
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Sun size={16} className="text-slate-500" />
                ) : (
                  <Moon size={16} className="text-slate-500" />
                )}
                {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
              </span>
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
              {/* Mục 4: Đăng xuất */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                  toast.success("Đã đăng xuất thành công");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-500 transition-colors"
              >
                <LogOut size={16} className="text-slate-500" /> Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
