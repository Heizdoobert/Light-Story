"use client";

import {
  HardDrive,
  BarChart3,
  Cloud,
  RefreshCw,
  CheckCircle,
  Layers,
  Database,
  Globe,
  Eye,
} from "lucide-react";
import { useAdminAnalytics } from "@/hooks/features/use-admin-analytics";

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
            Số liệu thực từ máy chủ — Cloudflare R2, hàng đợi và trạng thái binding.
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
          <p className="text-xs text-slate-400">{data?.r2_allocated_gb != null ? `Trên tổng ${data.r2_allocated_gb} GB dung lượng chuẩn` : "—"}</p>
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
            <span className="text-xs text-slate-400 font-medium">Hiệu Quả Lưu Trữ</span>
            <Database size={20} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">
            {loading ? "..." : data?.storage_efficiency_pct != null ? `${data.storage_efficiency_pct}%` : "—"}
          </p>
          <p className="text-xs text-slate-400">Đã dùng trên dung lượng chuẩn</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Hàng Đợi Backlog</span>
            <Layers size={20} className="text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-400">
            {loading ? "..." : (data?.queue_backlog ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">Tin nhắn đang chờ xử lý</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Lượt Truy Cập (30 ngày)</span>
            <Eye size={20} className="text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-cyan-400">{loading ? "..." : (data?.page_views ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400">Từ Analytics Engine thực tế</p>
        </div>
      </div>

      {/* R2 Storage Gauge */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-6">
        <h3 className="font-bold text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
          <HardDrive className="text-orange-500" size={20} />
          Mức Độ Sử Dụng Dung Lượng Cloudflare R2
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-slate-300">Dung lượng thực tế đã tải lên R2</span>
            <span className="text-orange-400 font-bold">{data?.r2_usage_gb ?? 0} GB / {data?.r2_allocated_gb != null ? `${data.r2_allocated_gb} GB` : "—"}</span>
          </div>

          <div className="w-full bg-slate-950 h-5 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${data ? Math.max(5, usagePct) : 0}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-400">
            Hiệu quả lưu trữ:{" "}
            <span className="font-bold text-emerald-400">
              {data?.storage_efficiency_pct != null ? `${data.storage_efficiency_pct}%` : "—"}
            </span>
          </p>
        </div>
      </div>

      {/* Device Distribution (real, from Analytics Engine) */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base border-b border-slate-800 pb-3 flex items-center gap-2">
          <Globe className="text-cyan-400" size={18} />
          Phân Bố Thiết Bị Đọc
        </h3>
        <p className="text-xs text-slate-500">Phần trăm trên tổng lượt truy cập 30 ngày (Analytics Engine).</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {(
            [
              { label: "Điện thoại (Mobile)", value: data?.device_mobile, color: "bg-orange-500", text: "text-orange-400" },
              { label: "Máy tính (Desktop)", value: data?.device_desktop, color: "bg-cyan-500", text: "text-cyan-400" },
              { label: "Máy tính bảng (Tablet)", value: data?.device_tablet, color: "bg-purple-500", text: "text-purple-400" },
            ] as Array<{ label: string; value: number | undefined; color: string; text: string }>
          ).map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className={`font-bold ${item.text}`}>{item.value != null ? `${item.value}%` : "—"}</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`${item.color} h-full rounded-full`}
                  style={{ width: item.value != null ? `${Math.max(2, item.value)}%` : "0%" }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Zones (real, from Analytics Engine) */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-lg">Tên Miền Truy Cập (Top 5)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Tên Miền</th>
                <th className="p-3">Số Lượng Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.top_zones && data.top_zones.length > 0 ? (
                data.top_zones.map((zone, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-400">{zone.zone}</td>
                    <td className="p-3 font-semibold text-white">{zone.requests.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-slate-500">
                    {loading ? "Đang tải dữ liệu..." : "Chưa có dữ liệu."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Binding Status */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-lg">Trạng Thái Binding Hạ Tầng</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Binding</th>
                <th className="p-3">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="p-3 font-mono font-bold text-cyan-400">R2_BUCKET (comic)</td>
                <td className="p-3">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle size={14} /> Hoạt động
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-cyan-400">LIGHTSTORY_QUEUE</td>
                <td className="p-3">
                  <span className={`flex items-center gap-1 font-bold ${data?.queue_binding === 'bound' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <CheckCircle size={14} /> {loading ? "..." : data?.queue_binding === 'bound' ? "Đã liên kết" : "Chưa liên kết"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-cyan-400">LIGHTSTORY_WORKFLOW</td>
                <td className="p-3">
                  <span className={`flex items-center gap-1 font-bold ${data?.workflow_binding === 'bound' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <CheckCircle size={14} /> {loading ? "..." : data?.workflow_binding === 'bound' ? "Đã liên kết" : "Chưa liên kết"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-cyan-400">APP_KV</td>
                <td className="p-3">
                  <span className={`flex items-center gap-1 font-bold ${data?.kv_binding === 'bound' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <CheckCircle size={14} /> {loading ? "..." : data?.kv_binding === 'bound' ? "Đã liên kết" : "Chưa liên kết"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Cập nhật lần cuối: {loading ? "..." : data?.recorded_at ? new Date(data.recorded_at).toLocaleString() : "—"}
        </p>
      </div>
    </div>
  );
}
