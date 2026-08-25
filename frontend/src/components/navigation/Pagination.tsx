"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Nếu chỉ có 1 trang hoặc không có trang nào thì ẩn luôn thanh phân trang
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;

    // Giữ nguyên các bộ lọc cũ (keyword, category, sort) và chỉ cập nhật page
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());

    router.push(`${pathname}?${params.toString()}`);
  };

  // Thuật toán hiển thị tối đa 5 nút trang xung quanh trang hiện tại
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  );

  return (
    <nav
      aria-label="Phân trang"
      role="navigation"
      className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 mt-8 sm:mt-12 mb-4"
    >
      {/* Nút về trang đầu (<<) */}
      <button
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        aria-label="Go to first page"
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none transition-colors shrink-0"
      >
        <ChevronsLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Nút lùi 1 trang (<) */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none transition-colors shrink-0"
      >
        <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Các nút số trang (1, 2, 3...) */}
      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            aria-label={`Trang ${page}`}
            aria-current={isActive ? "page" : undefined}
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none shrink-0 ${
              isActive
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105 sm:scale-110"
                : "text-slate-600 bg-transparent hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Nút tiến 1 trang (>) */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none transition-colors shrink-0"
      >
        <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>

      {/* Nút tới trang cuối (>>) */}
      <button
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Last page"
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none transition-colors shrink-0"
      >
        <ChevronsRight size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
    </nav>
  );
};
