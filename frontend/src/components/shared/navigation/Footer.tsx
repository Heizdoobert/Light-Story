"use client";

import { usePathname } from "next/navigation";

export const Footer = () => {
  const pathname = usePathname();
  
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="w-full bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/5 py-4 mt-auto transition-colors">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white">
            Light<span className="text-primary">Story</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm leading-relaxed">
            Nền tảng đọc truyện tranh bản quyền. Đăng tải và quản lý bởi Quản trị viên.
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-600">
          © 2026 LightStory. All rights reserved.
        </p>
      </div>
    </footer>
  );
};