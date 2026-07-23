"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/modules/language/LanguageContext";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type?: "info" | "success" | "warning";
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Chương mới ra mắt",
    message: "Ta là đại pháp sư - Chương 45 vừa được xuất bản!",
    timestamp: "10 phút trước",
    read: false,
    type: "info",
  },
  {
    id: "notif-2",
    title: "Cập nhật hệ thống",
    message: "Hệ thống Unified Gateway & Supabase đã sẵn sàng.",
    timestamp: "1 giờ trước",
    read: false,
    type: "success",
  },
  {
    id: "notif-3",
    title: "Chào mừng bạn đến với LightStory",
    message: "Khám phá hàng ngàn truyện tranh sắc nét mỗi ngày.",
    timestamp: "Hôm qua",
    read: true,
    type: "info",
  },
];

export const NotificationBell: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lightstory_notifications");
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {
      // Use defaults
    }
  }, []);

  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    try {
      localStorage.setItem("lightstory_notifications", JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleMarkItemRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    saveNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleToggle}
        className="relative p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
        aria-label="Notifications"
        title={t("notifications")}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {t("notifications")}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full">
                    {unreadCount} {t("unread")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1"
                    title={t("mark_all_read")}
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all text-xs font-bold"
                    title={t("clear_all")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 [scrollbar-width:thin]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  {t("no_notifications")}
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleMarkItemRead(item.id)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                      item.read
                        ? "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                        : "bg-blue-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.type === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black truncate">{item.title}</p>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.message}
                      </p>
                      <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
