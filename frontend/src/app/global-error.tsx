"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/constants/routes";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white shadow-lg p-8 sm:p-10 text-center space-y-5 mx-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              Lỗi Hệ Thống Nghiêm Trọng
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono">
                Mã lỗi: {error.digest}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Tải Lại
            </button>
            <a
              href={ROUTES.HOME}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            >
              Trang Chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
