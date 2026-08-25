"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { validateAdMarkup, type AdSlotKey } from "@/lib/admin/ad-policy";
import { saveSiteSettings } from "@/lib/actions/settings.actions";

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

const AD_SLOTS_DEF: Array<{ key: AdSlotKey; label: string }> = [
  { key: "ad_header", label: "Quảng Cáo Đầu Trang (Header Banner)" },
  { key: "ad_middle", label: "Quảng Cáo Giữa Trang (Middle Content)" },
  { key: "ad_sidebar", label: "Quảng Cáo Cột Bên (Sidebar Sticky)" },
  { key: "ad_left_side", label: "Quảng Cáo Trôi Trái (Left Side Floating)" },
  { key: "ad_right_side", label: "Quảng Cáo Trôi Phải (Right Side Floating)" },
];

export function useAdminAds() {
  const [ads, setAds] = useState<AdSetting[]>(
    AD_SLOTS_DEF.map((slot) => ({
      key: slot.key,
      label: slot.label,
      markup: "",
      active: false,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAdSettings = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from("site_settings").select("key, value");

      if (data && data.length > 0) {
        const settingsMap = new Map<string, string>();
        data.forEach((row) => settingsMap.set(row.key, row.value));

        setAds(
          AD_SLOTS_DEF.map((slot) => {
            const rawVal = settingsMap.get(slot.key);
            const markupStr = typeof rawVal === "string" ? rawVal : "";
            return {
              key: slot.key,
              label: slot.label,
              markup: markupStr,
              active: markupStr.trim().length > 0,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to load ad settings from server", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdSettings();
  }, [loadAdSettings]);

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
    for (const ad of ads) {
      if (ad.active && ad.markup.trim()) {
        const val = validateAdMarkup(ad.markup, DEFAULT_RUNTIME);
        if (!val.ok) {
          toast.error(`Lỗi mã HTML ở vị trí "${ad.label}": ${val.reason}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await saveSiteSettings({
        entries: ads.map((ad) => ({ key: ad.key, value: ad.active ? ad.markup : "" })),
      });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu quảng cáo");
    } catch (err) {
      toast.error((err as Error).message || "Không thể lưu quảng cáo");
    } finally {
      setSaving(false);
    }
  };

  return {
    ads,
    loading,
    saving,
    DEFAULT_RUNTIME,
    handleMarkupChange,
    handleToggleActive,
    handleSaveAds,
  };
}
