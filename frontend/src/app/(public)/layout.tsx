'use client';

import { useState } from 'react';
import { Header } from '@/components/navigation/Header';
import PublicFooter from '@/components/layout/public-footer';
import LoginModal from '@/components/auth/login-modal';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500 flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <main className="flex-grow w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}