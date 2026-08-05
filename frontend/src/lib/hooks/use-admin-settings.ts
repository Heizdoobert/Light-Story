"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function useAdminSettings() {
  const [siteName, setSiteName] = useState("LightStory");
  const [siteDescription, setSiteDescription] = useState("Website Đọc Truyện Tranh Trực Tuyến Tốc Độ Cao");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from("site_settings").select("key, value");

      if (data && data.length > 0) {
        data.forEach((row) => {
          if (row.key === "site_name" && typeof row.value === "string") setSiteName(row.value);
          if (row.key === "site_description" && typeof row.value === "string") setSiteDescription(row.value);
          if (row.key === "maintenance_mode") setMaintenanceMode(row.value === "true" || Boolean(row.value));
          if (row.key === "compact_mode") setCompactMode(row.value === "true" || Boolean(row.value));
        });
      }
    } catch (err) {
      console.error("Failed to load site settings from server", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const updates = [
        { key: "site_name", value: siteName, updated_at: new Date().toISOString() },
        { key: "site_description", value: siteDescription, updated_at: new Date().toISOString() },
        { key: "maintenance_mode", value: String(maintenanceMode), updated_at: new Date().toISOString() },
        { key: "compact_mode", value: String(compactMode), updated_at: new Date().toISOString() },
      ];

      for (const item of updates) {
        await supabase.from("site_settings").upsert(item);
      }

      toast.success("Cập nhật cài đặt hệ thống lên server thành công!");
    } catch (err: any) {
      toast.error(err.message || "Cập nhật cài đặt thất bại");
    } finally {
      setSaving(false);
    }
  };

  return {
    siteName,
    setSiteName,
    siteDescription,
    setSiteDescription,
    maintenanceMode,
    setMaintenanceMode,
    compactMode,
    setCompactMode,
    loading,
    saving,
    handleSaveSettings,
  };
}
