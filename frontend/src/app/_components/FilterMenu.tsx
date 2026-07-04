"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, Filter, XCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Category } from "@/types/entities"; // Đảm bảo import đúng Category

interface FilterMenuProps {
  // Đã xóa prop `categories` vì bây giờ Menu sẽ tự động đi lấy dữ liệu
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

  // State lưu trữ danh sách thể loại
  const [categories, setCategories] = useState<Category[]>([]);

  // Tự động tải danh sách thể loại ngay khi Menu được mở (sử dụng đường dẫn chuẩn)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get<any>(
          "/api/admin/taxonomy?entity=category",
        );
        // Kiểm tra an toàn dữ liệu trả về
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

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Ô TÌM KIẾM */}
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
        {/* 2. DROPDOWN THỂ LOẠI */}
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
            {categories.map((cat, index) => {
              // Bóc tách an toàn id và name
              const catId = cat.id || cat.name || String(index);
              const catName = cat.name || cat.id || "Không tên";

              return (
                // 💡 CHÚ Ý: Đổi value={catId} thành value={catName}
                <option key={catId} value={catName}>
                  {catName}
                </option>
              );
            })}
          </select>
        </div>

        {/* 3. DROPDOWN SẮP XẾP */}
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

        {/* 4. NÚT ÁP DỤNG */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-2 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Filter size={18} />
          Áp dụng & Tìm kiếm
        </motion.button>
      </div>
    </div>
  );  
};
