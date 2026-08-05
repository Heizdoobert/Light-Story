"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 shadow-lg p-8 sm:p-10 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldAlert className="text-red-500" size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Lỗi Trang Quản Trị
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {error.message || "Đã xảy ra lỗi trong bảng điều khiển quản trị. Vui lòng thử lại."}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={reset} className="gap-2 font-bold">
            <RotateCcw size={16} /> Thử Lại
          </Button>
          <Link href="/admin/dashboard">
            <Button variant="outline" className="gap-2 font-bold">
              <LayoutDashboard size={16} /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
