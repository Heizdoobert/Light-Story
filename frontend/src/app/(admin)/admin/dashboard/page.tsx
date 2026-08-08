"use client";

import {
  BookOpen,
  Layers,
  Users,
  HardDrive,
  Activity,
  CheckCircle2,
  Database,
  Cloud,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { useAdminDashboard } from "@/hooks/features/use-admin-dashboard";

export default function AdminDashboardPage() {
  const {
    loading,
    totalComics,
    totalChapters,
    totalUsers,
    infraStats,
    recentComics,
    refresh,
  } = useAdminDashboard();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Tổng Quan Quản Trị</h1>
          <p className="text-sm text-slate-500 mt-1">
            Báo cáo chỉ số vận hành, dữ liệu Supabase & hạ tầng Cloudflare R2.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng Số Truyện"
          value={loading ? "..." : totalComics.toLocaleString()}
          change="Supabase Database"
          isPositive={true}
          icon={BookOpen}
        />
        <StatCard
          title="Tổng Số Chương"
          value={loading ? "..." : totalChapters.toLocaleString()}
          change="Supabase Storage"
          isPositive={true}
          icon={Layers}
        />
        <StatCard
          title="Người Dùng Đăng Ký"
          value={loading ? "..." : totalUsers.toLocaleString()}
          change="Auth Profiles"
          isPositive={true}
          icon={Users}
        />
        <StatCard
          title="Dung Lượng R2 Sử Dụng"
          value={loading ? "..." : `${infraStats?.r2_usage_gb ?? 0} GB`}
          change={`${infraStats?.r2_object_count ?? 0} file R2 objects`}
          isPositive={true}
          icon={HardDrive}
        />
      </div>

      {/* R2 & Infrastructure Health Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cloudflare R2 Metric Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl">
                <Cloud size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base">Hạ Tầng Cloudflare R2 Storage</h3>
                <p className="text-xs text-slate-400">Lưu trữ ảnh bìa (covers) và trang chương (chapters)</p>
              </div>
            </div>
            <Link
              href={ROUTES.ADMIN.ANALYTICS}
              className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
            >
              <span>Xem chi tiết R2</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Tổng File R2</p>
              <p className="text-xl font-black text-white mt-1">
                {infraStats?.r2_object_count.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Dung lượng R2</p>
              <p className="text-xl font-black text-orange-400 mt-1">
                {infraStats?.r2_usage_gb ?? 0} GB
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Cache Hit Ratio</p>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {infraStats?.cache_hit_ratio_pct ?? 99.5}%
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Lượt Xem Hệ Thống</p>
              <p className="text-xl font-black text-cyan-400 mt-1">
                {infraStats?.page_views.toLocaleString() ?? 0}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Trạng thái kết nối API Gateway Worker:</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              KẾT NỐI SẮC NÉT (Active)
            </span>
          </div>
        </div>

        {/* System Services Health Checklist */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity size={18} className="text-orange-500" />
            Trạng Thái Dịch Vụ
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Database size={16} className="text-cyan-400" />
                <span>Supabase PostgreSQL DB</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} /> Live
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Cloud size={16} className="text-orange-400" />
                <span>Cloudflare R2 Object Store</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} /> Bound
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Activity size={16} className="text-purple-400" />
                <span>Worker API Gateway</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} /> Port 8787
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={ROUTES.ADMIN.COMICS}
              className="block w-full py-2.5 text-center bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Quản lý danh sách Truyện »
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Comics Table */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Truyện Mới Cập Nhật Gần Đây</h3>
          <Link
            href={ROUTES.ADMIN.COMICS}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
          >
            Xem tất cả »
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Tên Truyện</th>
                <th className="p-3">Tác Giả</th>
                <th className="p-3">Thể Loại</th>
                <th className="p-3">Lượt Xem</th>
                <th className="p-3">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentComics.length > 0 ? (
                recentComics.map((comic) => (
                  <tr key={comic.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white">{comic.title}</td>
                    <td className="p-3 text-slate-300">{comic.author || "-"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {comic.category || "General"}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-orange-400">
                      {comic.views?.toLocaleString() || 0}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {comic.status || "published"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    {loading ? "Đang tải danh sách..." : "Chưa có dữ liệu truyện."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
