'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/shared/navigation/Header';
import { LoginModal } from '@/components/shared/auth/LoginModal';

export function UserShell({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsLoginModalOpen(true);
    window.addEventListener('open-login-modal', handler);
    return () => window.removeEventListener('open-login-modal', handler);
  }, []);

  return (
    <>
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      {children}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}