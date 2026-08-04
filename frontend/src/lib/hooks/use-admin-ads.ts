"use client";

import { useState } from "react";
import { toast } from "sonner";
import { validateAdMarkup, type AdSlotKey } from "@/lib/admin/ad-policy";

export type AdSetting = {
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

export function useAdminAds() {
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

  return {
    ads,
    saving,
    DEFAULT_RUNTIME,
    handleMarkupChange,
    handleToggleActive,
    handleSaveAds,
  };
}
