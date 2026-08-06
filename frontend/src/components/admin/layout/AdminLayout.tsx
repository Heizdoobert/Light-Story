'use client';

/*
  AdminLayout.tsx
  Main layout for the Admin Dashboard with dynamic sidebar and topbar.
*/
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ChevronRight, Menu, X, House, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import { ThemeToggleButton } from './ThemeToggleButton';
import { NotificationBell } from "@/components/ui/notification-bell";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase/client';
import { ROUTES } from '@/lib/constants/routes';
import { getAdminMenuItems } from '@/lib/admin/admin-navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getFallbackAvatar, proxyAvatarUrl } from '@/lib/auth/security-utils';
import {
  DEFAULT_DASHBOARD_TAB_VISIBILITY,
  DEFAULT_SIDEBAR_MENU_VISIBILITY,
  isAdminMenuVisibleForRole,
  isDashboardTabVisibleForRole,
  parseDashboardTabVisibility,
  parseSidebarMenuVisibility,
  SITE_SETTING_KEYS,
} from '@/lib/admin/system-settings';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPrefetch?: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onTabPrefetch,
}) => {
  const { profile, role, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!profile?.id || !supabase) return;
    const sessionKey = `logged_access_${profile.id}_${new Date().toISOString().slice(0, 13)}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    void supabase
      .rpc('log_dashboard_access', {
        p_actor_user_id: profile.id,
        p_metadata: {
          path: typeof window !== 'undefined' ? window.location.pathname : ROUTES.ADMIN.ROOT,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      })
      .then(({ error }: { error: unknown }) => {
        if (error) console.error('Dashboard access log insert failed:', error);
      });
  }, [profile?.id]);

  const visibilityQuery = useQuery({
    queryKey: ["site_settings", "admin_visibility_controls"],
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: async () => {
      if (!supabase) {
        return {
          dashboardVisibility: DEFAULT_DASHBOARD_TAB_VISIBILITY,
          menuVisibility: DEFAULT_SIDEBAR_MENU_VISIBILITY,
        };
      }

      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key,value")
          .in("key", [SITE_SETTING_KEYS.dashboardTabVisibility, SITE_SETTING_KEYS.sidebarMenuVisibility]);

        if (error) {
          return {
            dashboardVisibility: DEFAULT_DASHBOARD_TAB_VISIBILITY,
            menuVisibility: DEFAULT_SIDEBAR_MENU_VISIBILITY,
          };
        }

        const map = new Map((data ?? []).map((item: { key: string; value: unknown }) => [item.key, item.value]));
        return {
          dashboardVisibility: parseDashboardTabVisibility(map.get(SITE_SETTING_KEYS.dashboardTabVisibility)),
          menuVisibility: parseSidebarMenuVisibility(map.get(SITE_SETTING_KEYS.sidebarMenuVisibility)),
        };
      } catch {
        return {
          dashboardVisibility: DEFAULT_DASHBOARD_TAB_VISIBILITY,
          menuVisibility: DEFAULT_SIDEBAR_MENU_VISIBILITY,
        };
      }
    },
  });

  const { t } = useLanguage();

  const filteredMenu = React.useMemo(() => {
    const dashboardVisibility = visibilityQuery.data?.dashboardVisibility ?? DEFAULT_DASHBOARD_TAB_VISIBILITY;
    const menuVisibility = visibilityQuery.data?.menuVisibility ?? DEFAULT_SIDEBAR_MENU_VISIBILITY;
    const menuItems = getAdminMenuItems(t);

    return menuItems.filter((item) => {
      if (!role || !item.roles.includes(role)) return false;
      return (
        isDashboardTabVisibleForRole(item.id, role, dashboardVisibility) &&
        isAdminMenuVisibleForRole(item.id, role, menuVisibility)
      );
    });
  }, [role, visibilityQuery.data, t]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t("logout_success"));
    } catch (error) {
      toast.error(t("logout_failed"));
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] dark:bg-slate-950 transition-colors duration-300 relative">
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-20"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: isSidebarOpen ? 0 : -280, width: 280 }
            : { x: 0, width: isSidebarOpen ? 280 : 80 }
        }
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl shrink-0 ${
          isMobile ? "fixed inset-y-0 left-0 z-30" : "sticky top-0 h-screen z-20"
        }`}
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
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={isSidebarOpen}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="px-4 pb-2">
          <Link
            href="/"
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 group"
          >
            <House
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            {isSidebarOpen && <span className="font-bold text-sm">{t("home")}</span>}
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-2 mt-4 pb-4 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (isMobile) setIsSidebarOpen(false);
              }}
              aria-current={activeTab === item.id ? "page" : undefined}
              onMouseEnter={() => onTabPrefetch?.(item.id)}
              onFocus={() => onTabPrefetch?.(item.id)}
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
            {isSidebarOpen && <span>{t("sign_out")}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between z-10 transition-colors">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Open sidebar"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 md:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs">
                {t("admin_panel")}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                {t("welcome_back").replace("{name}", profile?.full_name || t("admin"))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ThemeToggleButton />
            <NotificationBell role={role} />
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
              
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="relative focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-[#001eff] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={proxyAvatarUrl(profile?.avatar_url) || getFallbackAvatar(profile?.full_name || "Admin")}
                    alt="Avatar"
                    className="h-10 w-10 object-cover border-2 border-slate-100 dark:border-slate-800"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackAvatar(profile?.full_name || "Admin");
                    }}
                  />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setIsUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onTabChange("users");
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <Users size={16} />
                          User Settings
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          {t("sign_out")}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-8 dark:text-slate-100 flex flex-col justify-between">
          <div className="flex-1">{children}</div>
          <footer className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
            <div>© {new Date().getFullYear()} LightStory Admin Console. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t("system_operational")}
              </span>
              <span className="font-mono text-[11px] opacity-75">v1.0.0</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
