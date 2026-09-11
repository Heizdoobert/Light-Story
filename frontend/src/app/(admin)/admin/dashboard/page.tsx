"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  BookOpen,
  Database,
  Globe,
  HardDrive,
  Layers,
  Plus,
  Settings,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import {
  formatCompactNumber,
  formatFixedNumber,
} from "@/services/admin/analytics.service";
import { useRoleGuard } from "@/hooks/common/use-role-guard";
import { useLanguage } from "@/context/LanguageContext";

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
  recentSettingsChanges: SettingChange[];
};

type SettingChange = {
  id: string;
  action: string;
  actor_email: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const empty: OverviewData = {
  stats: null,
  engagement: null,
  infrastructure: null,
  stories: [],
  recentSettingsChanges: [],
};

/** Read a numeric field from the loosely-typed infrastructure object. */
const infraNum = (inf: Record<string, unknown> | null | undefined, key: string): number =>
  (inf?.[key] as number) ?? 0;

export default function AdminDashboardPage() {
  useRoleGuard(["superadmin", "admin", "employee"], ROUTES.ADMIN.COMICS);
  const { t } = useLanguage();
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

  const { stats, engagement, infrastructure, stories, recentSettingsChanges } = data;
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
          {t("dash_title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("dash_subtitle")}
        </p>
      </div>

      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
          {t("dash_loading")}
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/10 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
          {t("dash_error")}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Section title={t("dash_quick_actions")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  { href: ROUTES.ADMIN.COMICS, icon: Plus, labelKey: "dash_create_comic" },
                  { href: ROUTES.ADMIN.USERS, icon: Users, labelKey: "dash_manage_users" },
                  { href: ROUTES.ADMIN.ANALYTICS, icon: BarChart3, labelKey: "dash_view_analytics" },
                  { href: ROUTES.ADMIN.SETTINGS, icon: Settings, labelKey: "dash_system_settings" },
                ] as const).map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-500 hover:border-orange-500 hover:text-white text-slate-700 dark:text-slate-300 transition-all group"
                  >
                    <action.icon size={18} className="text-orange-500 group-hover:text-white transition-colors" />
                    <span className="text-sm font-semibold">{t(action.labelKey)}</span>
                  </Link>
                ))}
              </div>
            </Section>
          </motion.div>

          {/* Top stat cards — 2 rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              label={t("dash_total_stories")}
              value={formatCompactNumber(stats?.totalStories ?? 0)}
              sub={`${formatCompactNumber(stats?.activeStories ?? 0)} ${t("dash_active_stories")}`}
              icon={BookOpen}
              accent="text-orange-400"
            />
            <Card
              label={t("dash_total_chapters")}
              value={formatCompactNumber(stats?.totalChapters ?? 0)}
              sub={t("dash_chapters_posted")}
              icon={Layers}
              accent="text-cyan-400"
            />
            <Card
              label={t("dash_new_users_30d")}
              value={formatCompactNumber(engagement?.new_signups ?? 0)}
              sub={`${formatCompactNumber(engagement?.mau ?? 0)} ${t("dash_mau")}`}
              icon={Users}
              accent="text-emerald-400"
            />
            <Card
              label={t("dash_total_views")}
              value={formatCompactNumber(stats?.totalViews ?? 0)}
              sub={`${formatCompactNumber(engagement?.dau ?? 0)} ${t("dash_dau")}`}
              icon={TrendingUp}
              accent="text-purple-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              label={t("dash_r2_used")}
              value={`${formatFixedNumber(r2Usage, 1)} GB`}
              sub={
                r2Allocated > 0
                  ? t("dash_r2_allocated", `Trên tổng ${r2Allocated} GB dung lượng chuẩn`).replace("{n}", String(r2Allocated))
                  : "—"
              }
              icon={HardDrive}
              accent="text-orange-400"
            />
            <Card
              label={t("dash_r2_objects")}
              value={formatCompactNumber(infraNum(infrastructure, "r2_object_count"))}
              sub={t("dash_r2_objects_sub")}
              icon={Database}
              accent="text-cyan-400"
            />
            <Card
              label={t("dash_queue_backlog")}
              value={formatCompactNumber(infraNum(infrastructure, "queue_backlog"))}
              sub={t("dash_queue_sub")}
              icon={Layers}
              accent="text-purple-400"
            />
            <Card
              label={t("dash_page_views_30d")}
              value={formatCompactNumber(infraNum(infrastructure, "page_views"))}
              sub={t("dash_page_views_sub")}
              icon={TrendingUp}
              accent="text-cyan-400"
            />
          </div>

          {/* R2 Storage Gauge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Section
              title={t("dash_r2_gauge_title")}
              icon={<HardDrive className="text-orange-500" size={20} />}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">
                    {t("dash_r2_gauge_label")}
                  </span>
                  <span className="text-orange-400 font-bold">
                    {formatFixedNumber(r2Usage, 1)} GB /{" "}
                    {r2Allocated > 0 ? `${r2Allocated} GB` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${loading ? 0 : r2UsagePct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("dash_r2_efficiency")}{" "}
                  <span className="font-bold text-emerald-400">
                    {infraNum(infrastructure, "storage_efficiency_pct")}%
                  </span>
                </p>
              </div>
            </Section>
          </motion.div>

          {/* Device Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Section
              title={t("dash_device_title")}
              icon={<Globe className="text-cyan-400" size={18} />}
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t("dash_device_desc")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  {
                    label: t("dash_device_mobile"),
                    key: "device_mobile",
                    color: "bg-orange-500",
                    text: "text-orange-400",
                  },
                  {
                    label: t("dash_device_desktop"),
                    key: "device_desktop",
                    color: "bg-cyan-500",
                    text: "text-cyan-400",
                  },
                  {
                    label: t("dash_device_tablet"),
                    key: "device_tablet",
                    color: "bg-purple-500",
                    text: "text-purple-400",
                  },
                ] as const).map((item) => {
                  const val = infraNum(infrastructure, item.key);
                  return (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                        <span className={`font-bold ${item.text}`}>
                          {val > 0 ? `${val}%` : "—"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden">
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
          </motion.div>

          {/* Top Zones */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Section title={t("dash_zones_title")}>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Tên Miền</th>
                    <th className="p-3">Số Lượng Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {topZones.length > 0 ? (
                    topZones.map((zone, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-cyan-400">
                          {zone.zone}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {zone.requests.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="p-4 text-center text-slate-500 dark:text-slate-400"
                      >
                        {t("dash_no_data")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </motion.div>

          {/* Binding Status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Section title={t("dash_binding_title")}>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Binding</th>
                    <th className="p-3">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
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
                            {bound ? `✓ ${t("dash_binding_active")}` : `✗ ${t("dash_binding_inactive")}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                {t("dash_binding_updated")}{" "}
                {infrastructure?.recorded_at
                  ? new Date(
                      infrastructure.recorded_at as string
                    ).toLocaleString()
                  : "—"}
              </p>
            </Section>
          </motion.div>

          {/* Settings Change Log */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Section title={t("dash_settings_log_title")}>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Ai sửa</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Nội dung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {recentSettingsChanges.length > 0 ? (
                    recentSettingsChanges.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {log.actor_name || log.actor_email || "—"}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {Array.isArray(log.metadata?.keys)
                            ? (log.metadata.keys as string[]).join(", ")
                            : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-4 text-center text-slate-500 dark:text-slate-400"
                      >
                        {t("dash_settings_log_empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </motion.div>

          {/* Latest Stories */}
          {stories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <Section title={t("dash_latest_title")}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Truyện</th>
                      <th className="p-3">Tác Giả</th>
                      <th className="p-3">Lượt Xem</th>
                      <th className="p-3">Lượt Thích</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3">Ngày Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {stories.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{s.title}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{s.author}</td>
                        <td className="p-3 font-semibold text-cyan-400">
                          {s.views.toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-rose-400">
                          {s.like_count.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            </motion.div>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 rounded-2xl shadow-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        <Icon size={20} className={accent} />
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-6 shadow-xl space-y-4">
      <h3 className="font-bold text-lg border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
