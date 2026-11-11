'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/features/use-user';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import { ROUTES } from '@/lib/constants/routes';
import { AntdRegistry, LightStoryThemeProvider } from '@light-story/ui';

export default function AdminRouteGroupLayout({ children }: { children: React.ReactNode }) {
  const { isStaff, isLoading } = useUser();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const antdMode = theme === 'light' ? 'light' : 'dark';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <p className="text-sm font-semibold animate-pulse">{t('admin_checking_access')}</p>
      </div>
    );
  }

  // ponytail: client-side fallback when middleware didn't redirect — keep inline (SSR-safe);
  // middleware.ts:107 redirects to ROUTES.ERROR.FORBIDDEN for the canonical page.
  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-rose-500">{t('admin_access_denied')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin_access_denied_desc')}</p>
        <Link
          href={ROUTES.HOME}
          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-md"
        >
          {t('admin_back_to_home')}
        </Link>
      </div>
    );
  }

  // Every admin route (incl. /admin/dashboard) renders inside the AdminSidebar + AdminHeader shell with Ant Design theming.
  return (
    <AntdRegistry>
      <LightStoryThemeProvider mode={antdMode}>
        <div className="min-h-screen flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <AdminSidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            <AdminHeader onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
            <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </LightStoryThemeProvider>
    </AntdRegistry>
  );
}
