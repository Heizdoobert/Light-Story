"use client";

import {
  HardDrive,
  BarChart3,
  Cloud,
  Cpu,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  Zap,
  Globe,
} from "lucide-react";
import { useAdminAnalytics } from "@/lib/hooks/use-admin-analytics";

export default function AdminAnalyticsPage() {
  const { loading, data, usagePct, refresh } = useAdminAnalytics();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <BarChart3 className="text-orange-500" size={32} />
            Thống Kê Hạ Tầng & R2 Storage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Phân tích dung lượng Cloudflare R2, lưu lượng mạng, thiết bị người dùng và băng thông.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới chỉ số</span>
        </button>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Lưu Trữ R2 Đã Dùng</span>
            <HardDrive size={20} className="text-orange-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? "..." : `${data?.r2_usage_gb ?? 0} GB`}</p>
          <p className="text-xs text-slate-400">Trên tổng {data?.r2_allocated_gb ?? 10} GB dung lượng chuẩn</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tổng File R2 Objects</span>
            <Cloud size={20} className="text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-cyan-400">{loading ? "..." : (data?.r2_object_count ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400">Ảnh bìa & trang chương truyện</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cache Hit Ratio</span>
            <Zap size={20} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{loading ? "..." : `${data?.cache_hit_ratio_pct ?? 99.5}%`}</p>
          <p className="text-xs text-slate-400">Tỉ lệ phản hồi cực nhanh từ Edge Cache</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Độ Trễ Phản Hồi</span>
            <Cpu size={20} className="text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-400">{loading ? "..." : `${data?.d1_avg_latency_ms ?? 4.2} ms`}</p>
          <p className="text-xs text-slate-400">Thời gian xử lý trung bình Gateway</p>
        </div>
      </div>

      {/* R2 Storage Gauge & Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
            <HardDrive className="text-orange-500" size={20} />
            Mức Độ Sử Dụng Dung Lượng Cloudflare R2
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-300">Dung lượng thực tế đã tải lên R2</span>
              <span className="text-orange-400 font-bold">{data?.r2_usage_gb ?? 0} GB / {data?.r2_allocated_gb ?? 10} GB</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, usagePct)}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Băng thông Egress</p>
                <p className="text-base font-bold text-white mt-1">{data?.r2_egress_gb ?? 0.05} GB</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Ước tính Truyền tải</p>
                <p className="text-base font-bold text-cyan-400 mt-1">{data?.bandwidth_gb ?? 0} GB</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">Hiệu quả lưu trữ</p>
                <p className="text-base font-bold text-emerald-400 mt-1">{data?.storage_efficiency_pct ?? 100}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-base border-b border-slate-800 pb-3 flex items-center gap-2">
            <Globe className="text-cyan-400" size={18} />
            Phân Bố Thiết Bị Đọc
          </h3>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-2 text-slate-300">
                  <Smartphone size={14} className="text-orange-400" /> Điện thoại (Mobile)
                </span>
                <span className="text-orange-400 font-bold">{data?.device_mobile ?? 65}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${data?.device_mobile ?? 65}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-2 text-slate-300">
                  <Monitor size={14} className="text-cyan-400" /> Máy tính (Desktop)
                </span>
                <span className="text-cyan-400 font-bold">{data?.device_desktop ?? 30}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${data?.device_desktop ?? 30}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-2 text-slate-300">
                  <Tablet size={14} className="text-purple-400" /> Máy tính bảng (Tablet)
                </span>
                <span className="text-purple-400 font-bold">{data?.device_tablet ?? 5}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${data?.device_tablet ?? 5}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top API Domains & Cloudflare Status */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-lg">Trạng Thái Tải Tên Miền API Gateway</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Tên Miền Edge Zone</th>
                <th className="p-3">Số Lượng Requests</th>
                <th className="p-3">Tỉ Lệ Cache Edge</th>
                <th className="p-3">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.top_zones.map((zone, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-400">{zone.zone}</td>
                  <td className="p-3 font-semibold text-white">{zone.requests.toLocaleString()}</td>
                  <td className="p-3 text-emerald-400 font-bold">{zone.cache_hit_ratio_pct}%</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle size={14} /> Hoạt động
                    </span>
                  </td>
                </tr>
              )) ?? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500">
                    Chưa có dữ liệu domain.
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
