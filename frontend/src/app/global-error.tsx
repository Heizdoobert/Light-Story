"use client";

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-white dark:bg-slate-950">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đã xảy ra lỗi hệ thống</h2>
          <p className="text-sm text-slate-500 max-w-md">Vui lòng thử lại sau.</p>
          <Button onClick={() => reset()}>Thử lại</Button>
        </div>
      </body>
    </html>
  );
}
