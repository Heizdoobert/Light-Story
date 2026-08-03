"use client";

import type { FC } from 'react';
import { Menu, Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@core/hooks/useTheme';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm ứng dụng, trang, báo cáo..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800/60 border border-transparent focus:border-indigo-500 rounded-xl outline-none transition text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Chuyển chế độ Sáng/Tối"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shadow-sm">
            A
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Quản Trị Viên</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
