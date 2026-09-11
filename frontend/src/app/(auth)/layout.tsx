// ponytail: layout duplicated from (public); extract shared chrome only if a 3rd group needs it
'use client';

import { Header } from '@/components/navigation/Header';
import PublicFooter from '@/components/layout/public-footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
      >
        Bỏ qua điều hướng
      </a>
      <Header />
      <main id="main-content" className="flex-grow w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}
