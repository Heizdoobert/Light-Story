"use client";

import { useState, type FC, type ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuItems } from '@/@menu';
import {
  LayoutDashboard,
  Grid,
  Mail,
  MessageSquare,
  FileText,
  User,
  HelpCircle,
  DollarSign,
  CheckSquare,
  Layout,
  AlertCircle,
  Table,
  Layers,
  CreditCard,
  Square,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const iconMap: Record<string, ElementType> = {
  LayoutDashboard,
  Grid,
  Mail,
  MessageSquare,
  FileText,
  User,
  HelpCircle,
  DollarSign,
  CheckSquare,
  Layout,
  AlertCircle,
  Table,
  Layers,
  CreditCard,
  Square,
};

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    apps: true,
    pages: true,
    forms: true,
    ui: true,
  });

  const toggleSubmenu = (id: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComp = iconMap[iconName] || LayoutDashboard;
    return <IconComp className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />;
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-200 transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              Light Story
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">
              Admin Suite
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {menuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isSubmenuOpen = !!openSubmenus[item.id];
          const isActive = item.path === pathname || (item.children?.some(c => c.path === pathname));

          return (
            <div key={item.id} className="space-y-1">
              {hasChildren ? (
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-200 group ${
                    isActive
                      ? 'bg-slate-800/80 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}>
                      {renderIcon(item.icon)}
                    </span>
                    <span>{item.title}</span>
                  </div>
                  {isSubmenuOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.path || '#'}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-200 group ${
                    pathname === item.path
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}>
                      {renderIcon(item.icon)}
                    </span>
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}

              {/* Render Submenu items */}
              {hasChildren && isSubmenuOpen && (
                <div className="pl-9 pr-2 py-1 space-y-1 border-l border-slate-800 ml-5">
                  {item.children?.map((child) => {
                    const isChildActive = pathname === child.path;
                    return (
                      <Link
                        key={child.id}
                        href={child.path || '#'}
                        onClick={onCloseMobile}
                        className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition duration-150 ${
                          isChildActive
                            ? 'text-indigo-400 font-semibold bg-indigo-500/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                        <span>{child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Profile badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">Administrator</p>
            <p className="text-xs text-slate-400 truncate">admin@lightstory.vn</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
