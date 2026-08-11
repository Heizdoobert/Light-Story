"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveSiteSettings } from "@/lib/actions/settings.actions";
import {
  DEFAULT_SIDEBAR_CONTROL,
  SIDEBAR_CONTROL_KEY,
  parseSidebarControl,
  type SidebarControl,
} from "@/lib/admin/sidebar-settings";
import { toast } from "sonner";

export function useAdminSettings() {
  const [siteName, setSiteName] = useState("LightStory");
  const [siteDescription, setSiteDescription] = useState("Website Đọc Truyện Tranh Trực Tuyến Tốc Độ Cao");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [sidebarControl, setSidebarControl] = useState<SidebarControl>(DEFAULT_SIDEBAR_CONTROL);
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
          if (row.key === "maintenance_mode") setMaintenanceMode(row.value === "true");
          if (row.key === "compact_mode") setCompactMode(row.value === "true");
          if (row.key === SIDEBAR_CONTROL_KEY) setSidebarControl(parseSidebarControl(row.value));
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

  const handleSaveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await saveSiteSettings({
        entries: [
          { key: "site_name", value: siteName },
          { key: "site_description", value: siteDescription },
          { key: "maintenance_mode", value: String(maintenanceMode) },
          { key: "compact_mode", value: String(compactMode) },
          { key: SIDEBAR_CONTROL_KEY, value: JSON.stringify(sidebarControl) },
        ],
      });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu cài đặt");
    } catch (err) {
      toast.error((err as Error).message || "Không thể lưu cài đặt");
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
    sidebarControl,
    setSidebarControl,
    loading,
    saving,
    handleSaveSettings,
  };
}
