"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, XCircle, ChevronDown, Check } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Category } from "@/types/entities";

interface FilterMenuProps {
  onFilterChange?: (params: {
    keyword: string;
    category: string;
    sort: "newest" | "most_viewed" | "oldest";
  }) => void;
  onClose?: () => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  onFilterChange,
  onClose,
}) => {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"newest" | "most_viewed" | "oldest">(
    "newest",
  );
  const [categories, setCategories] = useState<Category[]>([]);

  // States quản lý trạng thái mở của Dropdown Tùy Chỉnh
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // State để người dùng gõ tìm kiếm thể loại bên trong Dropdown
  const [categorySearchTerm, setCategorySearchTerm] = useState("");

  // Refs để xử lý click ra ngoài thì tự đóng Dropdown
  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get<any>(
          "/api/admin/taxonomy?entity=category",
        );
        if (Array.isArray(res)) {
          setCategories(res);
        } else if (res && res.items) {
          setCategories(res.items);
        } else if (res && res.data) {
          setCategories(res.data);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách thể loại trong FilterMenu:", error);
      }
    };
    fetchCategories();
  }, []);

  // Xử lý Click Outside để đóng menu
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

  const handleApply = () => {
    if (onFilterChange) {
      onFilterChange({ keyword: searchInput.trim(), category, sort });
    } else {
      const queryParams = new URLSearchParams();
      if (searchInput.trim()) queryParams.append("keyword", searchInput.trim());
      if (category !== "all") queryParams.append("category", category);
      queryParams.append("sort", sort);

      router.push(`/search?${queryParams.toString()}`);
    }
    if (onClose) onClose();
  };

  // Lọc danh sách thể loại theo ô tìm kiếm bên trong
  const filteredCategories = categories.filter((cat) =>
    (cat.name || cat.id || "")
      .toLowerCase()
      .includes(categorySearchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Ô TÌM KIẾM CHUNG */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
          Tìm kiếm
        </label>
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tên truyện, tác giả..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-800 dark:text-white"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
        {/* 2. CUSTOM DROPDOWN THỂ LOẠI (Có thanh tìm kiếm) */}
        <div className="space-y-1.5 relative" ref={categoryRef}>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Thể loại
          </label>
          <div
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <span className="truncate">
              {category === "all" ? "Tất cả thể loại" : category}
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-300 ${isCategoryOpen ? "rotate-180" : ""}`}
            />
          </div>

          <AnimatePresence>
            {isCategoryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Thanh tìm kiếm thể loại (Rất hữu ích khi có > 50 thể loại) */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Tìm thể loại nhanh..."
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Ngăn click làm đóng menu
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900/50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Danh sách thể loại có thanh cuộn */}
                <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                  <div
                    onClick={() => {
                      setCategory("all");
                      setIsCategoryOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${category === "all" ? "bg-blue-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}
                  >
                    Tất cả thể loại
                    {category === "all" && <Check size={16} />}
                  </div>

                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat, index) => {
                      const catName = cat.name || cat.id || "Không tên";
                      const isSelected = category === catName;
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            setCategory(catName);
                            setIsCategoryOpen(false);
                          }}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors mt-1 ${isSelected ? "bg-blue-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}
                        >
                          {catName}
                          {isSelected && <Check size={16} />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-center text-slate-500">
                      Không tìm thấy "{categorySearchTerm}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. CUSTOM DROPDOWN SẮP XẾP */}
        <div className="space-y-1.5 relative" ref={sortRef}>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Sắp xếp theo
          </label>
          <div
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <span>
              {sort === "newest"
                ? "Mới cập nhật"
                : sort === "most_viewed"
                  ? "Lượt xem cao nhất"
                  : "Cũ nhất"}
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`}
            />
          </div>

          <AnimatePresence>
            {isSortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden p-2"
              >
                {[
                  { value: "newest", label: "Mới cập nhật" },
                  { value: "most_viewed", label: "Lượt xem cao nhất" },
                  { value: "oldest", label: "Cũ nhất" },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      setSort(option.value as any);
                      setIsSortOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${sort === option.value ? "bg-blue-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}
                  >
                    {option.label}
                    {sort === option.value && <Check size={16} />}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. NÚT ÁP DỤNG */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all duration-300 shadow-lg shadow-blue-500/25 dark:shadow-indigo-900/40"
        >
          <Filter size={18} />
          Áp dụng & Tìm kiếm
        </motion.button>
      </div>
    </div>
  );
};
