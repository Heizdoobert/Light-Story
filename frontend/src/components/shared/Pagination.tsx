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

    // Đổi URL và tự động cuộn lên trên mượt mà
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  };

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const siblingCount = 3;
    const boundaryCount = 2;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(
      currentPage - siblingCount,
      boundaryCount + 1,
    );
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPages - boundaryCount,
    );

    const showLeftEllipsis = leftSiblingIndex > boundaryCount + 1;
    const showRightEllipsis = rightSiblingIndex < totalPages - boundaryCount;

    pages.push(1, 2);

    if (showLeftEllipsis) {
      pages.push("ellipsis");
    }

    for (let page = leftSiblingIndex; page <= rightSiblingIndex; page += 1) {
      pages.push(page);
    }

    if (showRightEllipsis) {
      pages.push("ellipsis");
    }

    pages.push(totalPages - 1, totalPages);

    return pages.filter((page, index, arr) => {
      if (page === "ellipsis") return true;
      if (index > 0 && arr[index - 1] === "ellipsis") {
        return true;
      }
      return true;
    });
  };

  const pages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-12 mb-4">
      {/* Nút về trang đầu (<<) */}
      <button
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronsLeft size={18} />
      </button>

      {/* Nút lùi 1 trang (<) */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Các nút số trang */}
      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-400"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page as number)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              isActive
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110"
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
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight size={18} />
      </button>

      {/* Nút tới trang cuối (>>) */}
      <button
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronsRight size={18} />
      </button>
    </div>
  );
};
