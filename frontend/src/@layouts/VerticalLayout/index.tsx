"use client";

import { useState, type ReactNode, type FC } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface VerticalLayoutProps {
  children: ReactNode;
}

export const VerticalLayout: FC<VerticalLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          © {new Date().getFullYear()} Light Story Dashboard. Built with Next.js & Tailwind CSS.
        </footer>
      </div>
    </div>
  );
};

export default VerticalLayout;
