"use client";

import { Settings, Save, Database, Cloud, ShieldAlert, Sidebar, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/hooks/features/use-admin-settings";
import { CONFIGURABLE_ROLES, type ConfigurableRole } from "@/lib/admin/sidebar-settings";
import { useRoleGuard } from "@/hooks/common/use-role-guard";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminSettingsPage() {
  useRoleGuard(["superadmin"], ROUTES.ADMIN.COMICS);
  const {
    siteName,
    setSiteName,
    siteDescription,
    setSiteDescription,
    maintenanceMode,
    setMaintenanceMode,
    compactMode,
    setCompactMode,
    sidebarControl,
    setSidebarControl,
    saving,
    handleSaveSettings,
  } = useAdminSettings();

  const toggleSidebar = (role: ConfigurableRole) =>
    setSidebarControl((prev) => ({
      ...prev,
      sidebarEnabled: { ...prev.sidebarEnabled, [role]: !prev.sidebarEnabled[role] },
    }));

  const toggleCategories = (role: ConfigurableRole) =>
    setSidebarControl((prev) => ({
      ...prev,
      categoriesVisible: { ...prev.categoriesVisible, [role]: !prev.categoriesVisible[role] },
    }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="text-orange-500" size={28} />
            Cài Đặt Hệ Thống & Cấu Hình Site
          </h1>
          <p className="text-sm text-slate-500 mt-1">Cấu hình tên website, trạng thái bảo trì và tham số hệ thống</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* General Site Info */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Thông Tin Website</h3>

          <div>
            <label htmlFor="site-name" className="block text-xs font-semibold text-slate-300 mb-1">Tên Website *</label>
            <input
              id="site-name"
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="site-description" className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả SEO Meta Website</label>
            <textarea
              id="site-description"
              rows={3}
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* System Modes */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Chế Độ Hoạt Động & Bảo Trì</h3>

          <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" />
                Chế Độ Bảo Trì Website (Maintenance Mode)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Khi bật, chỉ tài khoản Admin mới có thể truy cập hệ thống.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                aria-label="Maintenance mode"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="text-sm font-bold text-white">Giao Diện Thu Gọn (Compact Mode)</p>
              <p className="text-xs text-slate-400 mt-0.5">Tối ưu mật độ hiển thị danh sách cho màn hình nhỏ.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                aria-label="Compact mode"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Sidebar Control & Per-Role Visibility */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">
            Điều Khiển Sidebar & Quyền Hiển Thị
          </h3>
          <p className="text-xs text-slate-400">
            Superadmin luôn thấy sidebar và tất cả menu. Cấu hình cho từng cấp quyền bên dưới.
          </p>

          {CONFIGURABLE_ROLES.map((role) => (
            <div key={role} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-orange-400">{role}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Sidebar size={16} className="text-cyan-400" />
                    Hiển Thị Sidebar
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Bật/tắt thanh điều hướng bên trái cho vai trò này.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sidebarControl.sidebarEnabled[role]}
                    onChange={() => toggleSidebar(role)}
                    aria-label={`Enable sidebar for ${role}`}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Tags size={16} className="text-emerald-400" />
                    Menu &quot;Thể Loại Truyện&quot;
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Hiển thị mục thể loại trên sidebar cho vai trò này.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sidebarControl.categoriesVisible[role]}
                    onChange={() => toggleCategories(role)}
                    aria-label={`Show categories for ${role}`}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Infrastructure Status */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Kết Nối Hạ Tầng Đã Thiết Lập</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Database className="text-cyan-400" size={24} />
              <div>
                <p className="text-xs font-bold text-white">Supabase Endpoint</p>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || "Chưa cấu hình (NEXT_PUBLIC_SUPABASE_URL)"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Cloud className="text-orange-400" size={24} />
              <div>
                <p className="text-xs font-bold text-white">Cloudflare R2 Bucket</p>
                <p className="text-[11px] font-mono text-slate-400 truncate">lightstory-assets (Bound)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 font-bold gap-2">
            <Save size={18} /> {saving ? "Đang lưu..." : "Lưu Cài Đặt Hệ Thống"}
          </Button>
        </div>
      </form>
    </div>
  );
}
