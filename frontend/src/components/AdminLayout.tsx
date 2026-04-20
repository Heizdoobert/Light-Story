/*
  AdminLayout.tsx
  Main layout for the Admin Dashboard with dynamic sidebar and topbar.
*/
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  DollarSign,
  LogOut,
  ChevronRight,
  Menu,
  X,
  PlusCircle,
  Bell,
  Sun,
  Moon,
  House,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { useTheme } from "../modules/theme/ThemeContext";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["superadmin", "admin", "employee"],
    },
    {
      id: "create_story",
      label: "Create Story",
      icon: PlusCircle,
      roles: ["superadmin", "admin", "employee"],
    },
    {
      id: "stories",
      label: "Stories",
      icon: BookOpen,
      roles: ["superadmin", "admin", "employee"],
    },
    { id: "users", label: "Users", icon: Users, roles: ["superadmin"] },
    {
      id: "ads",
      label: "Ads & Revenue",
      icon: DollarSign,
      roles: ["superadmin", "admin"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      roles: ["superadmin"],
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      roles: ["superadmin", "admin", "employee"],
    },
  ];

  const filteredMenu = menuItems.filter(
    (item) => role && item.roles.includes(role),
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col relative z-20 shadow-xl"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-black text-xl text-primary tracking-tighter"
              >
                LIGHTSTORY{" "}
                <span className="text-slate-400 dark:text-slate-300">DUT</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="px-4 pb-2">
          <Link
            to="/"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 group"
          >
            <House
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            {isSidebarOpen && <span className="font-bold text-sm">Home</span>}
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? "bg-slate-900 text-slate-50 shadow-lg shadow-slate-950/30 dark:bg-slate-800 dark:text-white dark:shadow-black/30"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <item.icon
                size={20}
                className={
                  activeTab === item.id
                    ? ""
                    : "group-hover:scale-110 transition-transform"
                }
              />
              {isSidebarOpen && (
                <span className="font-bold text-sm">{item.label}</span>
              )}
              {isSidebarOpen && activeTab === item.id && (
                <motion.div layoutId="active-pill" className="ml-auto">
                  <ChevronRight size={14} />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between z-10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs">
                Admin Panel
              </h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                Welcome back, {profile?.full_name || "Admin"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 dark:text-slate-300 hover:text-primary transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="relative p-2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:border-slate-800"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {profile?.full_name}
                </div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {role}
                </div>
              </div>
              <img
                src={
                  profile?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${profile?.full_name || "Admin"}&background=random`
                }
                alt="Avatar"
                className="h-10 w-10 rounded-xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 dark:text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
};
