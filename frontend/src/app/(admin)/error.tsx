"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route group error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
        <ShieldAlert size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Lỗi bảng quản trị (Admin Panel)
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {error.message || "Không thể tải dữ liệu bảng điều khiển. Vui lòng làm mới."}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-md"
      >
        <RefreshCw size={16} /> Thử lại
      </button>
    </div>
  );
}
