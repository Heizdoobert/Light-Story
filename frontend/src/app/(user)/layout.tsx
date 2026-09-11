'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserSidebar from '@/components/layout/user-sidebar';
import { Header } from '@/components/navigation/Header';
import PublicFooter from '@/components/layout/public-footer';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/constants/routes';
import UserLoading from './loading';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(ROUTES.LOGIN);
  }, [loading, user, router]);

  if (loading) return <UserLoading />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
      >
        Bỏ qua điều hướng
      </a>
      <Header />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <UserSidebar />
        <main id="main-content" className="flex-1 p-6">{children}</main>
      </div>
      <PublicFooter />
    </div>
  );
}
