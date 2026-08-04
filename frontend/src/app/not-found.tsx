import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="text-center space-y-4 max-w-md p-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-100">404</h1>
        <h2 className="text-xl font-semibold text-slate-200">Trang Không Tồn Tại</h2>
        <p className="text-sm text-slate-400">Đường dẫn bạn yêu cầu không thể tìm thấy hoặc đã bị di chuyển.</p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-orange-500 dark:bg-[#001eff] text-white font-semibold shadow-lg transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trở Về Trang Chủ</span>
        </Link>
      </div>
    </div>
  );
}
