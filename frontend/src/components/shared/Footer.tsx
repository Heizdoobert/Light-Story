import React from "react";

export const Footer = () => {
  return (
    <footer className="w-full bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/5 py-10 mt-auto pb-32 transition-colors">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h3 className="font-black text-xl text-slate-900 dark:text-white mb-2">
          Light<span className="text-primary">Story</span>
        </h3>
        <p className="text-sm text-slate-500 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
          Nền tảng đọc truyện tranh bản quyền siêu mượt. Mọi nội dung trên web đều được đăng tải và quản lý bởi đội ngũ Quản trị viên.
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-600 mt-4">
          © 2026 LightStory. All rights reserved.
        </p>
      </div>
    </footer>
  );
};