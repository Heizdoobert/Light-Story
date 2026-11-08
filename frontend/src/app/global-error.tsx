"use client";

import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/constants/routes";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  const traceId = (error as any)?.requestId || (error as any)?.digest || 'N/A';

  const handleCopyTraceId = async () => {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy trace ID:", err);
    }
  };

  return (
    <html lang="vi">
      <body className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 shadow-lg p-8 sm:p-10 text-center space-y-5 mx-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Lỗi Hệ Thống Nghiêm Trọng
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300">
                <span className="text-slate-400 dark:text-slate-500 font-sans">Mã lỗi:</span>
                <span className="font-semibold select-all">{traceId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyTraceId}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium inline-flex items-center gap-1.5 transition-colors"
                title="Sao chép mã lỗi"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span>Sao chép mã lỗi</span>
                  </>
                )}
              </button>
            </div>
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
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              Trang Chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
