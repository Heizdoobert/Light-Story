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
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  categories,
  onFilterChange,
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
    // BỎ md:flex-row và mb-12. Ép luôn luôn dùng flex-col xếp dọc
    <div className="flex flex-col gap-5">
      {/* Ô tìm kiếm từ khóa */}
      <div className="relative w-full">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm tên truyện, tác giả..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-800 dark:text-white"
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Dropdown Thể loại */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Thể loại
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer appearance-none"
          >
            <option value="all">Tất cả thể loại</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Sắp xếp */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Sắp xếp theo
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer appearance-none"
          >
            <option value="newest">Mới cập nhật</option>
            <option value="most_viewed">Lượt xem cao nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>

        {/* Nút Áp dụng Lọc */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-2 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Filter size={18} />
          Áp dụng bộ lọc
        </motion.button>
      </div>
    </div>
  );
};
