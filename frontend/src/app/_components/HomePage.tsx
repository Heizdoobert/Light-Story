"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react"; 
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  Image as ImageIcon,
  Menu,
  X,
} from "lucide-react";

import { fetchCategories } from "@/services/category.service";
import { SupabaseStoryRepository } from "@/services/repositories/SupabaseStoryRepository";
import { SupabaseChapterRepository } from "@/services/repositories/SupabaseChapterRepository";

import { Story, Chapter, Category } from "@/types/entities";
import { useAuth } from "@/modules/auth/AuthContext";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { LoginModal } from "@/components/shared/LoginModal";
import { FilterMenu } from "@/app/_components/FilterMenu";

const STAFF_ROLES = new Set(["superadmin", "admin", "employee"]);

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(role ?? "");
}

type HomePageProps = {
  initialStories?: Story[];
};

export const HomePage: React.FC<HomePageProps> = ({ initialStories = [] }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [latestChapters, setLatestChapters] = useState<Record<string, Chapter>>(
    {},
  );

  const [showFilter, setShowFilter] = useState(false);

  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(initialStories.length === 0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, profile, signOut, role } = useAuth();

  const [filterParams, setFilterParams] = useState({
    keyword: "",
    category: "all",
    sort: "newest" as "newest" | "most_viewed" | "oldest",
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
        const storyRepo = new SupabaseStoryRepository();
        const trendingData = await storyRepo.getStoriesPage({
          page: 1,
          pageSize: 6,
          sort: "most_viewed",
        });
        setTrendingStories(trendingData.items);
      } catch (error) {
        console.error("Lỗi tải thể loại:", error);
      }
    };
    loadCategories();
  }, []);

  const fetchStoriesData = useCallback(async () => {
    setLoading(true);
    try {
      const storyRepo = new SupabaseStoryRepository();
      const chapterRepo = new SupabaseChapterRepository();

      const result = await storyRepo.getStoriesPage({
        page: 1,
        pageSize: 15,
        keyword: filterParams.keyword || undefined,
        category: filterParams.category,
        sort: filterParams.sort,
      });

      const storiesData = result.items;
      setStories(storiesData);

      const chapterPromises = storiesData.map(async (story) => {
        const chapters = await chapterRepo.getChaptersByStoryId(story.id);
        if (chapters && chapters.length > 0) {
          const sortedChapters = chapters.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          return { storyId: story.id, chapter: sortedChapters[0] };
        }
        return { storyId: story.id, chapter: null };
      });

      const results = await Promise.all(chapterPromises);
      const chapterMap: Record<string, Chapter> = {};
      results.forEach((item) => {
        if (item.chapter) chapterMap[item.storyId] = item.chapter;
      });

      setLatestChapters(chapterMap);
    } catch (error) {
      console.error("Lỗi tải danh sách truyện:", error);
      toast.error(getErrorMessage(error, "fetch_homepage"));
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    fetchStoriesData();
  }, [fetchStoriesData]);

  const bounceClick = {
    whileTap: { scale: 0.92 },
    whileHover: { scale: 1.05 },
  };

  useEffect(() => {
    if (showFilter) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFilter]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500">
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-\[60\]"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-slate-900 z-[70] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-white font-black text-sm">
                    L
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                    Bộ lọc
                  </span>
                </div>
                <button
                  onClick={() => setShowFilter(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <FilterMenu
                  categories={categories}
                  onFilterChange={(newParams) => {
                    setFilterParams(newParams);
                    setShowFilter(false);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            {...bounceClick}
            onClick={() => setShowFilter(true)}
            className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-primary hover:text-white transition-colors"
          >
            <Menu size={22} />
          </motion.button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-2xl items-center justify-center text-white font-black shadow-lg shadow-primary/20">
              L
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-800 dark:text-white">
              Light<span className="text-primary">Story</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {isStaffRole(role) && (
                <Link href="/admin">
                  <motion.button
                    {...bounceClick}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <LayoutDashboard size={16} />
                    <span className="hidden lg:block">Quản trị</span>
                  </motion.button>
                </Link>
              )}
              <div className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 max-w-[120px]">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[11px] font-black text-primary uppercase tracking-wider">
                    {role}
                  </div>
                </div>
                <img
                  src={
                    profile?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${profile?.full_name || "User"}&background=random`
                  }
                  alt="Avatar"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-md object-cover"
                />
                <motion.button
                  {...bounceClick}
                  onClick={() => {
                    signOut();
                    toast.success("Đã đăng xuất thành công");
                  }}
                  className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  title="Đăng xuất"
                >
                  <LogOut size={18} />
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button
              {...bounceClick}
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </motion.button>
          )}
        </div>
      </nav>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
        {trendingStories.length > 0 && (
          <div className="mb-10 pt-2 sm:pt-4">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-2xl">🔥</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Đang Thịnh Hành
              </h2>
            </div>

            <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {trendingStories.map((story, index) => (
                <Link
                  key={`trending-${story.id}`}
                  href={`/story/${story.id}`}
                  className="group block relative w-[130px] sm:w-44 lg:w-48 flex-shrink-0 snap-start outline-none cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-slate-100 dark:bg-slate-800 shadow-md group-hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800">
                    <img
                      src={
                        story.cover_url ||
                        `https://picsum.photos/seed/${story.id}/400/600`
                      }
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90"></div>

                    <div
                      className={`absolute top-0 left-0 text-white font-black text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-br-xl shadow-lg z-10 ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-amber-600"
                          : index === 1
                            ? "bg-gradient-to-br from-slate-300 to-slate-500"
                            : index === 2
                              ? "bg-gradient-to-br from-amber-700 to-orange-900"
                              : "bg-slate-800/80 backdrop-blur-md"
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-1.5 group-hover:text-primary transition-colors">
                        {story.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80"></span>
                        {story.views.toLocaleString()} lượt xem
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Truyện Mới Cập Nhật
          </h2>
          {(filterParams.keyword ||
            filterParams.category !== "all" ||
            filterParams.sort !== "newest") && (
            <span className="px-3 py-1 text-[11px] font-bold text-primary bg-primary/10 rounded-full">
              Đang có bộ lọc
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : stories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-10 sm:p-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-slate-800/50"
          >
            <div className="text-5xl sm:text-6xl mb-6">📭</div>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-sm sm:text-lg">
              Không tìm thấy bộ truyện nào phù hợp.
            </p>
            <button
              onClick={() =>
                setFilterParams({
                  keyword: "",
                  category: "all",
                  sort: "newest",
                })
              }
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
            {stories.map((story, i) => (
              <Link
                key={story.id}
                href={`/story/${story.id}`}
                className="block outline-none cursor-pointer"
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 100,
                  }}
                  className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 border border-slate-100 dark:border-slate-800"
                >
                  <div className="relative overflow-hidden rounded-2xl mb-2 sm:mb-3 aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                    <img
                      src={
                        story.cover_url ||
                        `https://picsum.photos/seed/${story.id}/400/600`
                      }
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 sm:p-5">
                      <span className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <ImageIcon size={14} className="sm:w-4 sm:h-4" /> Đọc
                        ngay
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      <span
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shadow-sm backdrop-blur-md ${story.status === "completed" ? "bg-emerald-500/90 text-white" : "bg-primary/90 text-white"}`}
                      >
                        {story.status === "completed"
                          ? "Hoàn thành"
                          : "Đang cập nhật"}
                      </span>
                    </div>
                  </div>

                  <div className="px-1 pb-1 flex flex-col flex-1">
                    <h2 className="text-[13px] sm:text-base font-bold mb-1.5 sm:mb-2 text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                      {story.title}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3 sm:mb-4 mt-auto">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded sm:rounded-md line-clamp-1 w-fit max-w-full sm:max-w-[60%]">
                        {latestChapters[story.id]?.title || "Chưa có chương"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {latestChapters[story.id]?.created_at
                          ? new Date(
                              latestChapters[story.id].created_at,
                            ).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center pt-2 sm:pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-400">
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary/60"></span>
                        {story.views.toLocaleString()} lượt xem
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
