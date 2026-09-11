"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, Filter, XCircle, X, ChevronDown } from "lucide-react";
import { Category } from "@/types/entities";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import { apiClient } from "@/lib/api/apiClient";

type SortOption = "newest" | "most_viewed" | "oldest";

interface FilterMenuProps {
  onFilterChange?: (params: {
    keyword: string;
    category: string;
    sort: SortOption;
  }) => void;
  onClose?: () => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  onFilterChange,
  onClose,
}) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortOption>("newest");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ id: string; name: string }[]>(ROUTES.API.CATEGORIES)
      .then((rows) => {
        if (!active || !Array.isArray(rows)) return;
        setCategories(rows.map((row) => ({ ...row, created_at: "", updated_at: "" })));
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  const clearCategories = () => setSelectedCategories(new Set());

  const filteredCategories = categories.filter((cat) =>
    (cat.name || cat.id || "")
      .toLowerCase()
      .includes(categorySearchTerm.toLowerCase()),
  );

  const visibleCategories = showAllCategories ? filteredCategories : filteredCategories.slice(0, 12);
  const hasMore = filteredCategories.length > 12;

  const handleApply = () => {
    const categoryStr = selectedCategories.size > 0
      ? Array.from(selectedCategories).join(",")
      : "all";

    if (onFilterChange) {
      onFilterChange({ keyword: searchInput.trim(), category: categoryStr, sort });
    } else {
      const queryParams = new URLSearchParams();
      if (searchInput.trim()) queryParams.append("keyword", searchInput.trim());
      if (categoryStr !== "all") queryParams.append("category", categoryStr);
      queryParams.append("sort", sort);
      router.push(`${ROUTES.SEARCH}?${queryParams.toString()}`);
    }
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Search Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
          {t("search_label")}
        </label>
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-800 dark:text-white"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
        {/* 2. Multi-Select Category Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t("category_label")}
            </label>
            {selectedCategories.size > 0 && (
              <button
                onClick={clearCategories}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <X size={10} />
                {t("clear_selection") || "Xóa"}
              </button>
            )}
          </div>

          {/* Search inside categories */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder={t("quick_search_category")}
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {visibleCategories.length > 0 ? (
              visibleCategories.map((cat) => {
                const catName = cat.name || cat.id || t("unnamed");
                const isSelected = selectedCategories.has(catName);
                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCategory(catName)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {catName}
                  </motion.button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-center text-slate-500 w-full">
                {t("filter_no_results_for") || "No results for"} &quot;{categorySearchTerm}&quot;
              </div>
            )}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-1"
            >
              {showAllCategories
                ? t("show_less") || "Thu gọn"
                : `${t("see_all")} (${filteredCategories.length})`}
            </button>
          )}
        </div>

        {/* 3. Sort Dropdown */}
        <div className="space-y-1.5 relative" ref={sortRef}>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            {t("sort_by_label")}
          </label>
          <div
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <span>
              {sort === "newest"
                ? t("sort_newest")
                : sort === "most_viewed"
                  ? t("sort_most_viewed")
                  : t("sort_oldest")}
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`}
            />
          </div>

          {isSortOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden p-2"
            >
              {[
                { value: "newest", label: t("sort_newest") },
                { value: "most_viewed", label: t("sort_most_viewed") },
                { value: "oldest", label: t("sort_oldest") },
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    setSort(option.value as SortOption);
                    setIsSortOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${sort === option.value ? "bg-blue-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}
                >
                  {option.label}
                  {sort === option.value && <span className="text-blue-500">✓</span>}
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* 4. Apply Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleApply}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all duration-300 shadow-lg shadow-blue-500/25 dark:shadow-indigo-900/40"
        >
          <Filter size={18} />
          {t("apply_filter")}
        </motion.button>
      </div>
    </div>
  );
};
