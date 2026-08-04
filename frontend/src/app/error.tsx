"use client";

import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đã xảy ra lỗi hệ thống</h2>
      <p className="text-sm text-slate-500 max-w-md">{error.message || 'Vui lòng thử lại sau.'}</p>
      <Button onClick={() => reset()}>Thử lại</Button>
    </div>
  );
}
