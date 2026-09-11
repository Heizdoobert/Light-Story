import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl p-8 sm:p-10 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">Lỗi 404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Không Tìm Thấy Trang</h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Trang quản trị bạn yêu cầu không tồn tại hoặc có thể đã được di chuyển.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href={ROUTES.HOME}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-md"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
