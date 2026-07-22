"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Danh sách các tùy chọn để dễ quản lý
const SORT_OPTIONS = [
  { value: "newest", label: "Mới cập nhật" },
  { value: "most_viewed", label: "Lượt xem cao nhất" },
  { value: "oldest", label: "Cũ nhất" },
];

export const SortDropdown = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State quản lý việc đóng/mở menu
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get("sort") || "newest";
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Mới cập nhật";

  // Hiệu ứng: Tự động đóng menu khi người dùng click ra ngoài vùng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false); // Đóng menu sau khi chọn
  };

  return (
    <div className="flex items-center gap-2 w-fit">
      <ArrowUpDown size={16} className="text-slate-500 dark:text-slate-400" />
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
        Sắp xếp:
      </span>

      {/* Khu vực Dropdown Custom */}
      <div className="relative" ref={dropdownRef}>
        {/* 1. NÚT BẤM (Giao diện bo góc 2px như bạn yêu cầu) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 min-w-[160px] bg-white dark:bg-slate-900 border rounded-[2px] text-sm font-bold transition-colors focus:outline-none ${
            isOpen
              ? "border-primary text-primary dark:border-primary dark:text-primary"
              : "border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:border-slate-400 dark:hover:border-slate-500"
          }`}
        >
          <span>{currentLabel}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : "text-slate-500"}`}
          />
        </button>

        {/* 2. MENU THẢ XUỐNG (Hỗ trợ Dark/Light mode tuyệt đối) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 mt-1.5 w-full min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden"
            >
              <div className="flex flex-col py-1.5">
                {SORT_OPTIONS.map((option) => {
                  const isSelected = currentSort === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary dark:bg-primary/20"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {option.label}
                      {/* Dấu tích V cho item đang được chọn */}
                      {isSelected && (
                        <Check size={16} className="text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
