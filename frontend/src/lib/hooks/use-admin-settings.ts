"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useAdminSettings() {
  const [siteName, setSiteName] = useState("LightStory");
  const [siteDescription, setSiteDescription] = useState("Website Đọc Truyện Tranh Trực Tuyến Tốc Độ Cao");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      toast.success("Cập nhật cài đặt hệ thống thành công!");
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
    saving,
    handleSaveSettings,
  };
}
