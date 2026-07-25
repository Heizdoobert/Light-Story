"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LogIn,
  Menu,
  Search,
  Home,
  ChevronDown,
  Flame,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { apiClient } from "@/lib/api/apiClient";
import { Category } from "@/types/entities";

// 👉 IMPORT FILE BẠN VỪA TẠO VÀO ĐÂY
import { UserDropdown } from "@/components/shared/UserDropdown";

type HeaderProps = {
  onMenuClick: () => void;
  onLoginClick: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onLoginClick,
}) => {
  const { user } = useAuth(); // Lúc này Header chỉ cần biết có user hay không
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const bounceClick = {
    whileTap: { scale: 0.92 },
    whileHover: { scale: 1.05 },
  };

  // Tải danh mục
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get<any>(
          "/api/admin/taxonomy?entity=category",
        );
        if (Array.isArray(res)) setCategories(res);
        else if (res?.items) setCategories(res.items);
        else if (res?.data) setCategories(res.data);
      } catch (error) {
        console.error("Lỗi tải danh sách thể loại:", error);
      }
    };
    fetchCategories();
  }, []);

  // Click ra ngoài để đóng menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (keyword.trim())
      router.push(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
  };

  const navigateAndClose = (url: string) => {
    router.push(url);
    setIsCategoryOpen(false);
    setIsSortOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex flex-col shadow-sm">
      {/* ================= TẦNG 1: TOP BAR ================= */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-4">
        {/* CỤM BÊN TRÁI */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <motion.button
            {...bounceClick}
            onClick={onMenuClick}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all md:hidden"
          >
            <Menu size={22} />
          </motion.button>

          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer outline-none"
          >
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
              L
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-800 dark:text-white hidden sm:block">
              Light<span className="text-primary">Story</span>
            </span>
          </Link>
        </div>

        {/* CỤM CHÍNH GIỮA: Thanh tìm kiếm */}
        <div className="hidden md:flex flex-1 max-w-xl relative mx-4 group">
          <input
            type="text"
            placeholder="Tìm kiếm truyện, tác giả..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10.5 pl-5 pr-12 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {/* Nút bấm tìm kiếm */}
          <button
            onClick={handleSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all"
            title="Tìm kiếm"
          >
            <Search size={18} />
          </button>
        </div>

        {/* CỤM BÊN PHẢI */}
        <div className="flex items-center shrink-0 z-50">
          {user ? (
            /* 👉 NẾU ĐÃ ĐĂNG NHẬP: GỌI NÚT TÀI KHOẢN MỚI RA ĐÂY */
            <UserDropdown />
          ) : (
            /* 👉 NẾU CHƯA ĐĂNG NHẬP: HIỆN NÚT ĐĂNG NHẬP ĐỂ BẬT MODAL */
            <motion.button
              {...bounceClick}
              onClick={onLoginClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-full font-bold text-sm shadow-md shadow-blue-500/20 dark:shadow-indigo-900/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* ================= TẦNG 2: SUB-NAV ================= */}
      <div className="hidden md:block bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center h-12 text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 h-full px-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-primary transition-colors"
          >
            <Home size={16} /> Trang chủ
          </Link>

          <Link
            href="/search?sort=most_viewed"
            className="flex items-center gap-1.5 h-full px-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-primary transition-colors"
          >
            <Flame size={16} className="text-orange-500" /> Hot
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-1.5 h-full px-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-primary transition-colors"
          >
            <Clock size={16} /> Lịch sử
          </Link>

          {/* DROPDOWN THỂ LOẠI */}
          <div className="relative h-full" ref={categoryRef}>
            <button
              onClick={() => {
                setIsCategoryOpen(!isCategoryOpen);
                setIsSortOpen(false);
              }}
              className={`flex items-center gap-1.5 h-full px-4 transition-colors ${isCategoryOpen ? "bg-slate-200/50 dark:bg-slate-800/50 text-primary" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-primary"}`}
            >
              Thể loại{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${isCategoryOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isCategoryOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-0.5 w-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl shadow-2xl p-4 z-40"
                >
                  <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                    <button
                      onClick={() => navigateAndClose("/search")}
                      className="text-left text-[13px] font-semibold text-primary hover:underline"
                    >
                      Tất cả thể loại
                    </button>
                    {categories.map((cat, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          navigateAndClose(
                            `/search?category=${encodeURIComponent(cat.name || cat.id || "")}`,
                          )
                        }
                        className="text-left text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors truncate"
                        title={cat.name}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DROPDOWN XẾP HẠNG */}
          <div className="relative h-full" ref={sortRef}>
            <button
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsCategoryOpen(false);
              }}
              className={`flex items-center gap-1.5 h-full px-4 transition-colors ${isSortOpen ? "bg-slate-200/50 dark:bg-slate-800/50 text-primary" : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-primary"}`}
            >
              <TrendingUp size={16} /> Xếp hạng{" "}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-0.5 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl shadow-2xl py-2 z-40 flex flex-col"
                >
                  {[
                    { label: "Mới cập nhật", val: "newest" },
                    { label: "Top Lượt xem", val: "most_viewed" },
                    { label: "Cũ nhất", val: "oldest" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() =>
                        navigateAndClose(`/search?sort=${opt.val}`)
                      }
                      className="text-left px-5 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
