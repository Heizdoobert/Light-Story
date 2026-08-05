'use client';

import { useState } from 'react';
import UserSidebar from '@/components/layout/user-sidebar';
import { Header } from '@/components/navigation/Header';
import PublicFooter from '@/components/layout/public-footer';
import LoginModal from '@/components/auth/login-modal';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <UserSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <PublicFooter />
    </div>
  );
}
