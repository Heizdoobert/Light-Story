"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "VI" | "EN";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  VI: {
    notifications: "Thông báo",
    no_notifications: "Không có thông báo mới nào",
    mark_all_read: "Đánh dấu tất cả đã đọc",
    clear_all: "Xóa tất cả",
    unread: "Chưa đọc",
    all: "Tất cả",
    language: "Ngôn ngữ",
    vietnamese: "Tiếng Việt (VI)",
    english: "English (EN)",
    system_settings: "Cài đặt hệ thống",
    interface_controls: "Điều khiển giao diện",
    compact_layout: "Bố cục thu gọn",
    show_sync_badge: "Hiển thị huy hiệu đồng bộ",
    save_settings: "Lưu cài đặt",
    admin_dashboard: "Quản trị",
    login: "Đăng nhập",
    logout: "Đăng xuất",
  },
  EN: {
    notifications: "Notifications",
    no_notifications: "No new notifications",
    mark_all_read: "Mark all as read",
    clear_all: "Clear all",
    unread: "Unread",
    all: "All",
    language: "Language",
    vietnamese: "Tiếng Việt (VI)",
    english: "English (EN)",
    system_settings: "System Settings",
    interface_controls: "Interface Controls",
    compact_layout: "Compact Layout",
    show_sync_badge: "Show Live Sync Badge",
    save_settings: "Save Settings",
    admin_dashboard: "Admin Dashboard",
    login: "Sign In",
    logout: "Sign Out",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "VI",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("VI");

  useEffect(() => {
    const saved = localStorage.getItem("lightstory_language") as Language | null;
    if (saved === "EN" || saved === "VI") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lightstory_language", lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] ?? translations["EN"]?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
