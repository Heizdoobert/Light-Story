import React from 'react';
import Link from 'next/link';
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react';

interface TaskbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  user: any;
  signOut: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  user,
  signOut,
  isLoginModalOpen,
  setIsLoginModalOpen,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* App name and logo */}
            <Link href="/" className="flex items-center space-x-2 font-bold text-lg text-primary dark:text-white">
              <LayoutDashboard size={20} />
              <span>Light Story</span>
            </Link>

            {/* Sorting dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 bg-gray-50 dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="flex-1 mx-4">
            {/* Search bar */}
            <input
              type="text"
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-600 dark:text-white placeholder-dark:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* User options */}
            {user ? (
              <>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-sm dark:text-slate-300">{user.email}</span>
                <button
                  onClick={signOut}
                  className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};