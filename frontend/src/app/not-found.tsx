import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 sm:p-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lỗi 404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Không Tìm Thấy Trang</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
          Trang bạn yêu cầu không tồn tại hoặc có thể đã được di chuyển.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href={ROUTES.HOME}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            Trang Chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
