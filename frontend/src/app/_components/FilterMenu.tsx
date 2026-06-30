"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Search, Filter } from "lucide-react";
import { Category } from "@/types/entities";

interface FilterMenuProps {
  categories: Category[];
  onFilterChange: (params: {
    keyword: string;
    category: string;
    sort: "newest" | "most_viewed" | "oldest";
  }) => void;
  className?: string; // ← Thêm prop này để linh hoạt style
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  categories,
  onFilterChange,
  className = "",
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"newest" | "most_viewed" | "oldest">(
    "newest",
  );

  const handleApply = () => {
    onFilterChange({ keyword: searchInput, category, sort });
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="flex flex-col md:flex-row gap-4 lg:items-end">
        {/* Tìm kiếm */}
        <div className="flex-1 min-w-0">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
            Tìm kiếm
          </label>
          <div className="relative">
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
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none text-sm"
            />
          </div>
        </div>

        {/* Thể loại */}
        <div className="md:w-64">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
            Thể loại
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
          >
            <option value="all">Tất cả thể loại</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="md:w-52">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
            Sắp xếp
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="most_viewed">Lượt xem cao</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>

        {/* Nút Áp dụng */}
        <div className="md:pt-6 shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="w-full md:w-auto px-7 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Áp dụng</span>
            <span className="sm:hidden">Lọc</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
