"use client";

import { useState } from "react";
import { Megaphone, Save, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateAdMarkup, type AdSlotKey } from "@/lib/admin/ad-policy";

type AdSetting = {
  key: AdSlotKey;
  label: string;
  markup: string;
  active: boolean;
};

const DEFAULT_RUNTIME = {
  enabled: true,
  minHeight: 120,
  refreshSeconds: 120,
  allowedHosts: ["pagead2.googlesyndication.com"],
  blockedTerms: ["adult", "porn", "casino"],
};

const INITIAL_ADS: AdSetting[] = [
  { key: "ad_header", label: "Quảng Cáo Đầu Trang (Header Banner)", markup: '<a href="https://example.com" target="_blank"><img src="https://placehold.co/970x90/001eff/ffffff?text=Header+Banner+Ad" alt="Ad" /></a>', active: true },
  { key: "ad_middle", label: "Quảng Cáo Giữa Trang (Middle Content)", markup: '<a href="https://example.com" target="_blank"><img src="https://placehold.co/728x90/ff008d/ffffff?text=Middle+Ad+Banner" alt="Ad" /></a>', active: true },
  { key: "ad_sidebar", label: "Quảng Cáo Cột Bên (Sidebar Sticky)", markup: '<a href="https://example.com" target="_blank"><img src="https://placehold.co/300x250/39ff14/000000?text=Sidebar+Ad" alt="Ad" /></a>', active: true },
  { key: "ad_left_side", label: "Quảng Cáo Trôi Trái (Left Side Floating)", markup: '<div className="p-2 text-center text-xs text-white bg-slate-800">Left Floating Ad</div>', active: false },
  { key: "ad_right_side", label: "Quảng Cáo Trôi Phải (Right Side Floating)", markup: '<div className="p-2 text-center text-xs text-white bg-slate-800">Right Floating Ad</div>', active: false },
];

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdSetting[]>(INITIAL_ADS);
  const [saving, setSaving] = useState(false);

  const handleMarkupChange = (key: AdSlotKey, value: string) => {
    setAds((prev) =>
      prev.map((ad) => (ad.key === key ? { ...ad, markup: value } : ad))
    );
  };

  const handleToggleActive = (key: AdSlotKey) => {
    setAds((prev) =>
      prev.map((ad) => (ad.key === key ? { ...ad, active: !ad.active } : ad))
    );
  };

  const handleSaveAds = async () => {
    setSaving(true);
    try {
      // Validate all markups
      for (const ad of ads) {
        if (ad.active && ad.markup.trim()) {
          const val = validateAdMarkup(ad.markup, DEFAULT_RUNTIME);
          if (!val.ok) {
            toast.error(`Lỗi mã HTML ở vị trí "${ad.label}": ${val.reason}`);
            setSaving(false);
            return;
          }
        }
      }

      toast.success("Lưu cấu hình quảng cáo thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lưu cấu hình thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="text-orange-500" size={28} />
            Quản Lý Vị Trí Quảng Cáo (Ad Slots)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cấu hình mã HTML banner quảng cáo trên các vị trí hiển thị giao diện
          </p>
        </div>
        <Button onClick={handleSaveAds} disabled={saving} className="gap-2 bg-orange-500 hover:bg-orange-600 font-bold shrink-0">
          <Save size={18} /> {saving ? "Đang lưu..." : "Lưu Cấu Hình Quảng Cáo"}
        </Button>
      </div>

      <div className="space-y-4">
        {ads.map((ad) => {
          const validation = validateAdMarkup(ad.markup, DEFAULT_RUNTIME);
          return (
            <div
              key={ad.key}
              className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-white">{ad.label}</span>
                  <span className="text-xs font-mono text-cyan-400">({ad.key})</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-400 font-semibold">
                    {ad.active ? "Hiển thị" : "Ẩn vị trí"}
                  </span>
                  <input
                    type="checkbox"
                    checked={ad.active}
                    onChange={() => handleToggleActive(ad.key)}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Mã nhúng HTML / Banner Markup:
                </label>
                <textarea
                  rows={3}
                  value={ad.markup}
                  onChange={(e) => handleMarkupChange(ad.key, e.target.value)}
                  placeholder="Nhập thẻ <a>, <img> hoặc <iframe> quảng cáo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {ad.markup.trim() && (
                <div className="flex items-center gap-2 text-xs">
                  {validation.ok ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle size={14} /> Mã HTML hợp lệ (Valid markup)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <AlertTriangle size={14} /> Lỗi mã HTML: {validation.reason}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
