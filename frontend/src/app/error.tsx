"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[Root Error]", error);
  }, [error]);

  const errorRecord = error as Error & { requestId?: string; digest?: string };
  const traceId = errorRecord?.requestId || errorRecord?.digest || 'N/A';
  const isDevelopment = process.env.NODE_ENV !== "production";

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
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 shadow-lg p-8 sm:p-10 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="text-red-500" size={32} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Đã Xảy Ra Lỗi Hệ Thống
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {isDevelopment && error.message ? error.message : "Vui lòng thử lại sau."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="text-slate-400 dark:text-slate-500 font-sans">Mã lỗi:</span>
              <span className="font-semibold select-all">{traceId}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTraceId}
              className="gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Sao chép mã lỗi"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Sao chép mã lỗi</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={reset} className="gap-2 font-bold">
            <RotateCcw size={16} /> Thử Lại
          </Button>
          <Link href={ROUTES.HOME}>
            <Button variant="outline" className="gap-2 font-bold">
              <Home size={16} /> Trang Chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
