"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Database,
  Globe,
  HardDrive,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import {
  formatCompactNumber,
  formatFixedNumber,
} from "@/services/admin/analytics.service";
import { useRoleGuard } from "@/hooks/common/use-role-guard";

type OverviewStats = {
  totalStories: number;
  totalChapters: number;
  activeStories: number;
  totalViews: number;
};

type EngagementSummary = {
  mau?: number;
  new_signups?: number;
  dau?: number;
};

type Story = {
  id: string;
  title: string;
  author: string;
  views: number;
  like_count: number;
  status: string;
  created_at: string;
};

type OverviewData = {
  stats: OverviewStats | null;
  engagement: EngagementSummary | null;
  infrastructure: Record<string, unknown> | null;
  stories: Story[];
};

const empty: OverviewData = {
  stats: null,
  engagement: null,
  infrastructure: null,
  stories: [],
};

/** Read a numeric field from the loosely-typed infrastructure object. */
const infraNum = (inf: Record<string, unknown> | null | undefined, key: string): number =>
  (inf?.[key] as number) ?? 0;

export default function AdminDashboardPage() {
  useRoleGuard(["superadmin"], ROUTES.ADMIN.COMICS);
  const [data, setData] = useState<OverviewData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<OverviewData>(ROUTES.API.ADMIN.ANALYTICS_DASHBOARD, { signal: AbortSignal.timeout(20000) })
      .then((result) => {
        if (cancelled) return;
        setData(result ?? empty);
        setLoading(false);
        setError(!result);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { stats, engagement, infrastructure, stories } = data;
  const r2Usage = infraNum(infrastructure, "r2_usage_gb");
  const r2Allocated = infraNum(infrastructure, "r2_allocated_gb");
  const r2UsagePct =
    r2Allocated > 0 ? Math.max(5, (r2Usage / r2Allocated) * 100) : 0;
  const topZones = (infrastructure?.top_zones as Array<{ zone: string; requests: number }>) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">
          Tổng Quan Quản Trị
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Số liệu thực từ máy chủ — truyện, chương, người dùng và hạ tầng.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-slate-500 animate-pulse">
          Đang tải số liệu...
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Không thể tải số liệu. Kiểm tra kết nối gateway và thử lại.
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Top stat cards — 2 rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              label="Tổng Số Truyện"
              value={formatCompactNumber(stats?.totalStories ?? 0)}
              sub={`${formatCompactNumber(stats?.activeStories ?? 0)} đang hoạt động`}
              icon={BookOpen}
              accent="text-orange-400"
            />
            <Card
              label="Tổng Số Chương"
              value={formatCompactNumber(stats?.totalChapters ?? 0)}
              sub="chương đã đăng"
              icon={Layers}
              accent="text-cyan-400"
            />
            <Card
              label="Người Dùng Mới (30 ngày)"
              value={formatCompactNumber(engagement?.new_signups ?? 0)}
              sub={`${formatCompactNumber(engagement?.mau ?? 0)} người dùng hoạt động`}
              icon={Users}
              accent="text-emerald-400"
            />
            <Card
              label="Lượt Đọc Tổng"
              value={formatCompactNumber(stats?.totalViews ?? 0)}
              sub={`${formatCompactNumber(engagement?.dau ?? 0)} người đọc hôm nay`}
              icon={TrendingUp}
              accent="text-purple-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              label="Lưu Trữ R2 Đã Dùng"
              value={`${formatFixedNumber(r2Usage, 1)} GB`}
              sub={
                r2Allocated > 0
                  ? `Trên tổng ${r2Allocated} GB dung lượng chuẩn`
                  : "—"
              }
              icon={HardDrive}
              accent="text-orange-400"
            />
            <Card
              label="Tổng File R2 Objects"
              value={formatCompactNumber(infraNum(infrastructure, "r2_object_count"))}
              sub="Ảnh bìa & trang chương truyện"
              icon={Database}
              accent="text-cyan-400"
            />
            <Card
              label="Hàng Đợi Backlog"
              value={formatCompactNumber(infraNum(infrastructure, "queue_backlog"))}
              sub="Tin nhắn đang chờ xử lý"
              icon={Layers}
              accent="text-purple-400"
            />
            <Card
              label="Lượt Truy Cập (30 ngày)"
              value={formatCompactNumber(infraNum(infrastructure, "page_views"))}
              sub="Từ Analytics Engine thực tế"
              icon={TrendingUp}
              accent="text-cyan-400"
            />
          </div>

          {/* R2 Storage Gauge */}
          <Section
            title="Mức Độ Sử Dụng Dung Lượng Cloudflare R2"
            icon={<HardDrive className="text-orange-500" size={20} />}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-300">
                  Dung lượng thực tế đã tải lên R2
                </span>
                <span className="text-orange-400 font-bold">
                  {formatFixedNumber(r2Usage, 1)} GB /{" "}
                  {r2Allocated > 0 ? `${r2Allocated} GB` : "—"}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${loading ? 0 : r2UsagePct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                Hiệu quả lưu trữ:{" "}
                <span className="font-bold text-emerald-400">
                  {infraNum(infrastructure, "storage_efficiency_pct")}%
                </span>
              </p>
            </div>
          </Section>

          {/* Device Distribution */}
          <Section
            title="Phân Bố Thiết Bị Đọc"
            icon={<Globe className="text-cyan-400" size={18} />}
          >
            <p className="text-xs text-slate-500 mb-4">
              Phần trăm trên tổng lượt truy cập 30 ngày (Analytics Engine).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                {
                  label: "Điện thoại (Mobile)",
                  key: "device_mobile",
                  color: "bg-orange-500",
                  text: "text-orange-400",
                },
                {
                  label: "Máy tính (Desktop)",
                  key: "device_desktop",
                  color: "bg-cyan-500",
                  text: "text-cyan-400",
                },
                {
                  label: "Máy tính bảng (Tablet)",
                  key: "device_tablet",
                  color: "bg-purple-500",
                  text: "text-purple-400",
                },
              ] as const).map((item) => {
                const val = infraNum(infrastructure, item.key);
                return (
                  <div key={item.key}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">{item.label}</span>
                      <span className={`font-bold ${item.text}`}>
                        {val > 0 ? `${val}%` : "—"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full`}
                        style={{
                          width: val > 0 ? `${Math.max(2, val)}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Top Zones */}
          <Section title="Tên Miền Truy Cập (Top 5)">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Tên Miền</th>
                  <th className="p-3">Số Lượng Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topZones.length > 0 ? (
                  topZones.map((zone, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-cyan-400">
                        {zone.zone}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        {zone.requests.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="p-4 text-center text-slate-500"
                    >
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Binding Status */}
          <Section title="Trạng Thái Binding Hạ Tầng">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Binding</th>
                  <th className="p-3">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  { name: "R2_BUCKET (comic)", always: true },
                  { name: "LIGHTSTORY_QUEUE", key: "queue_binding" },
                  { name: "LIGHTSTORY_WORKFLOW", key: "workflow_binding" },
                  { name: "APP_KV", key: "kv_binding" },
                ].map((b) => {
                  const bound =
                    "always" in b && b.always
                      ? true
                      : (infrastructure?.[(b as { key: string }).key] as string) === "bound";
                  return (
                    <tr key={b.name}>
                      <td className="p-3 font-mono font-bold text-cyan-400">
                        {b.name}
                      </td>
                      <td className="p-3">
                        <span
                          className={`flex items-center gap-1 font-bold ${bound ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {bound ? "✓ Hoạt động" : "✗ Chưa liên kết"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-3">
              Cập nhật lần cuối:{" "}
              {infrastructure?.recorded_at
                ? new Date(
                    infrastructure.recorded_at as string
                  ).toLocaleString()
                : "—"}
            </p>
          </Section>

          {/* Latest Stories */}
          {stories.length > 0 && (
            <Section title="Truyện Mới Nhất">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Truyện</th>
                    <th className="p-3">Tác Giả</th>
                    <th className="p-3">Lượt Xem</th>
                    <th className="p-3">Lượt Thích</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3">Ngày Tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stories.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-bold text-white">{s.title}</td>
                      <td className="p-3 text-slate-300">{s.author}</td>
                      <td className="p-3 font-semibold text-cyan-400">
                        {s.views.toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-rose-400">
                        {s.like_count.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ---- Small shared helpers (inline, not exported) ---- */

function Card({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <Icon size={20} className={accent} />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
      <h3 className="font-bold text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
