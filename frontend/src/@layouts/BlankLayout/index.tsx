"use client";

import type { ReactNode, FC } from 'react';

interface BlankLayoutProps {
  children: ReactNode;
}

export const BlankLayout: FC<BlankLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      {children}
    </div>
  );
};

export default BlankLayout;
