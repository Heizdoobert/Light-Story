"use client";

import { Settings, Save, Database, Cloud, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/hooks/features/use-admin-settings";

export default function AdminSettingsPage() {
  const {
    siteName,
    setSiteName,
    siteDescription,
    setSiteDescription,
    maintenanceMode,
    setMaintenanceMode,
    compactMode,
    setCompactMode,
    saving,
    handleSaveSettings,
  } = useAdminSettings();

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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Website *</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mô Tả SEO Meta Website</label>
            <textarea
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
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Kết Nối Hạ Tầng Đã Thiết Lập</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Database className="text-cyan-400" size={24} />
              <div>
                <p className="text-xs font-bold text-white">Supabase Endpoint</p>
                <p className="text-[11px] font-mono text-slate-400 truncate">https://xgtlrztskoomimvfpdoy.supabase.co</p>
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
