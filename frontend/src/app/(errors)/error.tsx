"use client";

import { useEffect } from "react";
import { Lock, RefreshCw } from "lucide-react";

export default function ErrorsErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Errors route group error:", error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
        <Lock size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Lỗi xử lý trang
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        {isDevelopment && error.message ? error.message : "Không thể tải trang. Vui lòng thử lại."}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-md"
      >
        <RefreshCw size={16} /> Thử lại
      </button>
    </div>
  );
}
