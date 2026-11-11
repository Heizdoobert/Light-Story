"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  Menu,
  Globe,
  Sun,
  Moon,
  Search,
  Loader2,
  Home,
  BarChart2,
  Bookmark,
  Users,
  User,
  ChevronDown,
  Ellipsis,
  X,
  Tag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationBell } from "@/components/ui/notification-bell";
import { toast } from "sonner";
import Image from "next/image";
import { apiClient } from "@/lib/api/apiClient";
import { Category, Story } from "@/types/entities";
import { fetchStoriesPage } from "@/services/comics/story.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getFallbackAvatar, proxyAvatarUrl } from "@/lib/security/security-utils";
import { ROUTES } from "@/lib/constants/routes";
import dynamic from "next/dynamic";

const QuickSearchModal = dynamic(
  () => import("@/components/shared/ui/QuickSearchModal").then((mod) => mod.QuickSearchModal),
  { ssr: false }
);

const STAFF_ROLES = new Set(["superadmin", "admin", "employee"]);

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(role ?? "");
}

type HeaderProps = {
  onLoginClick?: () => void;
};

export const Header: React.FC<HeaderProps> = ({ onLoginClick }) => {
  const router = useRouter();
  const [pathname, setPathname] = useState<string>("/");
  const { user, profile, signOut, role } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Story[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryFilter.toLowerCase().trim()),
  );

  const getComicCover = (comic: Story) => {
    const raw = comic.cover_url || "";
    if (!raw) return "https://placehold.co/400x600/png?text=No+Cover";
    return proxiedR2ImageUrl(raw);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(false);
    if (searchKeyword.trim()) {
      router.push(`${ROUTES.SEARCH}?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      router.push(ROUTES.SEARCH);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          setQuickSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Live search effect
  useEffect(() => {
    const trimmed = searchKeyword.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchStoriesPage({ keyword: trimmed, page: 1, pageSize: 7, sort: "newest" }).catch(() => null);
        setSearchResults(res?.items ?? []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Category navigation: load genres from API
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

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileMenu]);

  // Escape closes the mobile drawer and menus
  useEffect(() => {
    if (!showMobileMenu && !isMoreMenuOpen && !showCategoryDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileMenu(false);
        setIsMoreMenuOpen(false);
        setShowCategoryDropdown(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMobileMenu, isMoreMenuOpen, showCategoryDropdown]);

  const bounceClick = {
    whileTap: { scale: 0.94 },
    whileHover: { scale: 1.03 },
  };

  const toggleLanguage = () => {
    const nextLang = language === "VI" ? "EN" : "VI";
    setLanguage(nextLang);
    toast.success(nextLang === "VI" ? "Đã chuyển sang Tiếng Việt (VI)" : "Switched to English (EN)");
  };

  const isNavActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/" || href === ROUTES.HOME) {
      return pathname === "/" || pathname === ROUTES.HOME;
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-sm border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      {/* Top Header Bar */}
      <nav className="px-4 sm:px-6 lg:px-12 py-3 sm:py-3.5 lg:py-4 flex items-center justify-between gap-3 sm:gap-4 min-h-[64px] sm:min-h-[72px]">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <motion.button
            {...bounceClick}
            onClick={() => setShowMobileMenu(true)}
            aria-label={t("header_open_menu")}
            aria-expanded={showMobileMenu}
            aria-controls="mobile-nav-drawer"
            className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <Menu size={22} />
          </motion.button>

          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-95 transition-opacity cursor-pointer outline-none shrink-0 group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 rounded-2xl flex shrink-0 items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-orange-500/25 group-hover:scale-105 transition-transform">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                Light<span className="text-orange-500 dark:text-accent">Story</span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase hidden sm:inline mt-0.5">
                Manga & Webtoon
              </span>
            </div>
          </Link>
        </div>

        {/* Center Search Box with Live Dropdown & Keyboard Shortcut */}
        {/* Mobile search trigger button */}
        <button
          onClick={() => setQuickSearchOpen(true)}
          className="flex sm:hidden p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all shrink-0 cursor-pointer"
          aria-label={t("search")}
          title={t("search")}
        >
          <Search size={20} />
        </button>

        {/* Desktop interactive search container */}
        <div ref={searchContainerRef} className="relative hidden sm:flex items-center flex-1 max-w-lg sm:max-w-xl mx-4 lg:mx-8">
          <form onSubmit={handleSearchSubmit} className="w-full flex items-center relative">
            <div className="relative w-full flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true);
                }}
                placeholder={t("search_placeholder")}
                aria-label={t("search_placeholder")}
                className="w-full pl-11 pr-24 py-2.5 sm:py-3 rounded-full text-sm font-medium bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 shadow-2xs"
              />

              {/* Clear button if text entered */}
              {searchKeyword.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword("");
                    setSearchResults([]);
                    setShowResults(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-14 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Xóa từ khóa"
                >
                  <X size={16} />
                </button>
              )}

              {/* Search submit button */}
              <button
                type="submit"
                aria-label={t("search")}
                className="absolute right-2 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-full transition-all flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20 cursor-pointer"
                title={t("search")}
              >
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown List */}
          <AnimatePresence>
            {showResults && searchKeyword.trim() !== "" && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{language === "VI" ? "Gợi ý truyện" : "Suggested Comics"}</span>
                  <span className="text-[10px] text-orange-500 font-bold">{searchResults.length} kết quả</span>
                </div>

                {isSearching && searchResults.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={15} className="animate-spin text-orange-500" />
                    <span>{t("searching")}</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    {t("no_comics_found")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                    {searchResults.map((comic) => (
                      <Link
                        key={`search-res-${comic.id}`}
                        href={ROUTES.COMIC_DETAIL(comic.id)}
                        onClick={() => setShowResults(false)}
                        className="flex items-center gap-3 p-3 hover:bg-orange-50/50 dark:hover:bg-slate-800/80 transition-colors group"
                      >
                        <Image
                          src={getComicCover(comic)}
                          alt={comic.title}
                          width={44}
                          height={60}
                          loading="lazy"
                          className="w-11 h-15 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400x600/png?text=No+Cover";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                            {comic.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {comic.author || t("updating")}
                          </p>
                          {comic.status && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {comic.status}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={`${ROUTES.SEARCH}?keyword=${encodeURIComponent(searchKeyword.trim())}`}
                      onClick={() => setShowResults(false)}
                      className="block p-3 text-center text-xs font-bold text-orange-500 dark:text-orange-400 bg-slate-50 dark:bg-slate-950/80 hover:bg-orange-500 hover:text-white transition-all"
                    >
                      {language === "VI" ? `Xem tất cả kết quả cho "${searchKeyword}" »` : `See all results for "${searchKeyword}" »`}
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section: Theme Toggle, Language, Notifications, User / Login */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* Theme Toggle Button (Light/Dark) */}
          <motion.button
            {...bounceClick}
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Chuyển sang chế độ sáng"}
            className="min-w-[46px] min-h-[46px] flex items-center justify-center rounded-xl bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title={
              theme === "light"
                ? language === "VI"
                  ? "Chuyển sang Chế độ Tối"
                  : "Switch to Dark Mode"
                : language === "VI"
                ? "Chuyển sang Chế độ Sáng"
                : "Switch to Light Mode"
            }
          >
            {theme === "light" ? <Moon size={18} className="text-slate-700" /> : <Sun size={18} className="text-amber-400" />}
          </motion.button>

          {/* More menu on mobile below md */}
          <div className="relative md:hidden" ref={moreMenuRef}>
            <motion.button
              {...bounceClick}
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              aria-label={t("header_more_menu")}
              aria-haspopup="menu"
              aria-expanded={isMoreMenuOpen}
              className="min-w-[46px] min-h-[46px] flex items-center justify-center rounded-xl bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-200 hover:bg-orange-500 hover:text-white transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <Ellipsis size={22} />
            </motion.button>

            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden"
                >
                  <button
                    onClick={toggleLanguage}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                  >
                    <Globe size={16} className="text-orange-500" />
                    <span>{language === "VI" ? "English (EN)" : "Tiếng Việt (VI)"}</span>
                  </button>

                  <div className="px-4 py-2.5 flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <NotificationBell />
                    <span>{t("notifications")}</span>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  {user ? (
                    <Link
                      href={ROUTES.USER.PROFILE}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                    >
                      <User size={16} className="text-slate-400" />
                      <span>{language === "VI" ? "Hồ sơ cá nhân" : "User Profile"}</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        router.push(ROUTES.LOGIN);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                    >
                      <LogIn size={16} />
                      <span>{t("login")}</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop inline controls */}
          <div className="hidden md:flex items-center gap-2.5 sm:gap-3.5">
            {/* Language Switcher */}
            <motion.button
              {...bounceClick}
              onClick={toggleLanguage}
              className="flex items-center gap-2 min-h-[46px] px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title={language === "VI" ? "Switch to English (EN)" : "Chuyển sang Tiếng Việt (VI)"}
            >
              <Globe size={16} className="text-orange-500" />
              <span>{language}</span>
            </motion.button>

            {/* Notification Bell */}
            <NotificationBell />

            {user ? (
              <div className="flex items-center gap-3.5">
                {isStaffRole(role) && (
                  <Link
                    href={ROUTES.ADMIN.ROOT}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-orange-500/20 transition-all hover:scale-102 min-h-[46px]"
                  >
                    <LayoutDashboard size={16} />
                    <span className="hidden lg:inline">{t("admin_dashboard")}</span>
                  </Link>
                )}

                <div className="flex items-center gap-3.5 pl-3.5 border-l border-slate-200 dark:border-slate-800">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 max-w-[130px]">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </div>
                    <div className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">
                      {role}
                    </div>
                  </div>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      aria-label="Menu tài khoản"
                      aria-haspopup="menu"
                      aria-expanded={isUserMenuOpen}
                      className="relative focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all"
                    >
                      <Image
                        src={proxyAvatarUrl(profile?.avatar_url) || getFallbackAvatar(profile?.full_name || "User")}
                        alt="Avatar"
                        width={44}
                        height={44}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-orange-500 object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackAvatar(profile?.full_name || "User");
                        }}
                      />
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden"
                        >
                          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                              {profile?.full_name || user.email?.split("@")[0]}
                            </div>
                            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">
                              {role}
                            </div>
                          </div>

                          {isStaffRole(role) && (
                            <Link
                              href={ROUTES.ADMIN.ROOT}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 sm:hidden"
                            >
                              <LayoutDashboard size={15} />
                              <span>{t("admin_dashboard")}</span>
                            </Link>
                          )}

                          <Link
                            href={ROUTES.USER.PROFILE}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                          >
                            <User size={15} className="text-slate-400" />
                            <span>{language === "VI" ? "Hồ sơ cá nhân" : "User Profile"}</span>
                          </Link>

                          <Link
                            href={ROUTES.USER.FAVORITES}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                          >
                            <Bookmark size={15} className="text-slate-400" />
                            <span>{t("nav_bookmarks")}</span>
                          </Link>

                          <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />

                          <button
                            onClick={async () => {
                              setIsUserMenuOpen(false);
                              try {
                                await signOut();
                                toast.success(t("logout_success"));
                                router.push(ROUTES.HOME);
                              } catch {
                                toast.error(t("logout_failed"));
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 cursor-pointer"
                          >
                            <LogOut size={15} />
                            <span>{t("logout")}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : (
              <motion.button
                {...bounceClick}
                onClick={() => (onLoginClick ? onLoginClick() : router.push(ROUTES.LOGIN))}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-sm shadow-sm shadow-orange-500/25 transition-all cursor-pointer min-h-[46px]"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">{t("login")}</span>
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* Secondary Modern Navigation Bar */}
      <div
        className="relative bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-700 dark:text-slate-200 border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-12 transition-colors min-h-[54px] sm:min-h-[60px] flex items-center"
        ref={categoryDropdownRef}
      >
        <div className="w-full flex items-center justify-start md:justify-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar font-bold text-xs sm:text-sm tracking-wide py-2 sm:py-2.5 scroll-smooth">
          {/* Trang chủ */}
          <Link
            href="/"
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive("/") && pathname === "/"
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
            title={t("nav_home")}
          >
            <Home size={17} />
            <span className="hidden sm:inline">{t("nav_home")}</span>
          </Link>

          {/* THỂ LOẠI Dropdown Toggle */}
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            aria-expanded={showCategoryDropdown}
            aria-haspopup="true"
            aria-label={t("nav_categories_title")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              showCategoryDropdown
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Menu size={17} />
            <span>{t("nav_categories_title")}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showCategoryDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {/* DANH SÁCH THỂ LOẠI */}
          <Link
            href={ROUTES.GENRES}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.GENRES)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Tag size={17} />
            <span>{t("category_list_title")}</span>
          </Link>

          {/* XẾP HẠNG */}
          <Link
            href={`${ROUTES.SEARCH}?sort=most_viewed`}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              pathname === ROUTES.SEARCH && searchKeyword === ""
                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <BarChart2 size={17} />
            <span>{t("nav_rankings")}</span>
          </Link>

          {/* TÌM TRUYỆN */}
          <Link
            href={ROUTES.SEARCH}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.SEARCH)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Search size={17} />
            <span>{t("nav_search_comics")}</span>
          </Link>

          {/* THEO DÕI */}
          <Link
            href={ROUTES.USER.FAVORITES}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.USER.FAVORITES)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Bookmark size={17} />
            <span>{t("nav_bookmarks")}</span>
          </Link>

          {/* HỒ SƠ */}
          <Link
            href={ROUTES.USER.PROFILE}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.USER.PROFILE)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <User size={17} />
            <span>{language === "VI" ? "HỒ SƠ" : "PROFILE"}</span>
          </Link>

          {/* GROUP */}
          <Link
            href={ROUTES.GROUP}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.GROUP)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Users size={17} />
            <span>{t("nav_group")}</span>
          </Link>

          {/* FANPAGE */}
          <Link
            href={ROUTES.FANPAGE}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 ${
              isNavActive(ROUTES.FANPAGE)
                ? "bg-orange-500 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-orange-500"
            }`}
          >
            <Globe size={17} />
            <span>{t("nav_fanpage")}</span>
          </Link>
        </div>

        {/* Right scroll fade hint for mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent pointer-events-none md:hidden" />

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {showMobileMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileMenu(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[80]"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                role="dialog"
                aria-modal="true"
                id="mobile-nav-drawer"
                aria-label={t("header_nav_drawer")}
                className="fixed top-0 left-0 h-screen h-[100dvh] max-h-[100dvh] w-[88vw] sm:w-96 max-w-sm sm:max-w-md bg-white dark:bg-slate-950 z-[90] shadow-2xl flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 overscroll-contain"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-amber-600 rounded-xl flex shrink-0 items-center justify-center text-white font-extrabold text-sm shadow-sm">
                      L
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                      Light<span className="text-orange-500">Story</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    aria-label={t("header_close_menu")}
                    className="p-2 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="p-4 flex-1 overflow-y-auto space-y-5 custom-scrollbar overscroll-contain">
                  {/* User Profile Card or Login CTA */}
                  {user ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
                      <Image
                        src={proxyAvatarUrl(profile?.avatar_url) || getFallbackAvatar(profile?.full_name || "User")}
                        alt="Avatar"
                        width={42}
                        height={42}
                        className="w-11 h-11 rounded-full border-2 border-orange-500 object-cover shrink-0"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackAvatar(profile?.full_name || "User");
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">
                          {profile?.full_name || user.email?.split("@")[0]}
                        </div>
                        <div className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider mt-0.5">
                          {role}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setShowMobileMenu(false);
                          try {
                            await signOut();
                            toast.success(t("logout_success"));
                            router.push(ROUTES.HOME);
                          } catch {
                            toast.error(t("logout_failed"));
                          }
                        }}
                        className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                        aria-label={t("logout")}
                        title={t("logout")}
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 text-center space-y-2.5">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {language === "VI"
                          ? "Đăng nhập để theo dõi truyện và lưu lịch sử đọc"
                          : "Sign in to bookmark comics and sync reading history"}
                      </p>
                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          if (onLoginClick) onLoginClick();
                          else router.push(ROUTES.LOGIN);
                        }}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                        aria-label={t("login")}
                      >
                        <LogIn size={15} />
                        <span>{t("login")}</span>
                      </button>
                    </div>
                  )}

                  {/* Mobile Navigation Links */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1">
                      {language === "VI" ? "Điều hướng" : "Navigation"}
                    </div>
                    <Link
                      href={ROUTES.HOME}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Home size={18} className="text-orange-500" />
                      <span>{t("nav_home")}</span>
                    </Link>
                    <Link
                      href={`${ROUTES.SEARCH}?sort=most_viewed`}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <BarChart2 size={18} className="text-amber-500" />
                      <span>{t("nav_rankings")}</span>
                    </Link>
                    <Link
                      href={ROUTES.SEARCH}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Search size={18} className="text-sky-500" />
                      <span>{t("nav_search_comics")}</span>
                    </Link>
                    <Link
                      href={ROUTES.GENRES}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Tag size={18} className="text-emerald-500" />
                      <span>{t("category_list_title")}</span>
                    </Link>
                    <Link
                      href={ROUTES.USER.FAVORITES}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Bookmark size={18} className="text-rose-500" />
                      <span>{t("nav_bookmarks")}</span>
                    </Link>
                    <Link
                      href={ROUTES.USER.PROFILE}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <User size={18} className="text-indigo-500" />
                      <span>{language === "VI" ? "Hồ Sơ" : "Profile"}</span>
                    </Link>
                    {isStaffRole(role) && (
                      <Link
                        href={ROUTES.ADMIN.ROOT}
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs transition-colors"
                      >
                        <LayoutDashboard size={18} />
                        <span>{t("admin_dashboard")}</span>
                      </Link>
                    )}
                  </div>

                  {/* Mobile Categories Grid */}
                  <div>
                    <h2 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-3">
                      {t("category_list_title")}
                    </h2>
                    <div className="grid grid-cols-2 gap-1.5">
                      {categories.map((cat) => (
                        <Link
                          key={`mob-cat-${cat.id || cat.name}`}
                          href={`/search?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setShowMobileMenu(false)}
                          className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white transition-all truncate text-center"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drawer Footer: Pinned Theme & Language Dock */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex gap-2 shrink-0 pb-safe">
                  <button
                    onClick={toggleLanguage}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
                  >
                    <Globe size={14} className="text-orange-500" />
                    <span>{language === "VI" ? "Tiếng Việt" : "English"}</span>
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
                  >
                    {theme === "light" ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
                    <span>{theme === "light" ? "Giao diện Tối" : "Giao diện Sáng"}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Category Dropdown (Mobile Full-Height Bottom Sheet & Desktop Megamenu Popover) */}
        <AnimatePresence>
          {showCategoryDropdown && (
            <>
              {/* Mobile Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowCategoryDropdown(false);
                  setCategoryFilter("");
                }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[85] sm:hidden"
              />

              {/* Mobile Full-Height Bottom Sheet (< sm) */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="fixed inset-x-0 bottom-0 z-[95] h-[88dvh] max-h-[92dvh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden sm:hidden border-t border-slate-200 dark:border-slate-800 overscroll-contain"
              >
                {/* Drag Handle & Header */}
                <div className="pt-3 pb-2.5 px-4 flex flex-col items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mb-2.5" />
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {t("category_list_title")}
                      </span>
                      <span className="text-xs text-orange-500 font-bold">({filteredCategories.length})</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowCategoryDropdown(false);
                        setCategoryFilter("");
                      }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 cursor-pointer"
                      aria-label="Đóng danh mục"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Filter Search Input on Mobile */}
                  <div className="w-full mt-3 relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      placeholder={language === "VI" ? "Tìm kiếm thể loại..." : "Filter categories..."}
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    />
                    {categoryFilter && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile scrollable grid with custom-scrollbar */}
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                  <div className="grid grid-cols-2 gap-2 pb-6">
                    {filteredCategories.map((cat) => (
                      <Link
                        key={`mob-sheet-cat-${cat.id || cat.name}`}
                        href={`/search?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => {
                          setShowCategoryDropdown(false);
                          setCategoryFilter("");
                        }}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white transition-all text-center truncate"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Desktop Megamenu Popover (≥ sm) */}
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[680px] lg:w-[880px] max-w-5xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 sm:p-5 normal-case text-xs"
              >
                {/* Desktop Header with Quick Filter Input */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                      {t("category_list_title")}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">({filteredCategories.length} thể loại)</span>
                  </div>

                  {/* Filter input on Desktop */}
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      placeholder={language === "VI" ? "Tìm nhanh thể loại..." : "Search categories..."}
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    />
                    {categoryFilter && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <Link
                    href={ROUTES.GENRES}
                    onClick={() => {
                      setShowCategoryDropdown(false);
                      setCategoryFilter("");
                    }}
                    className="px-3.5 py-1.5 bg-orange-50 dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded-full font-bold text-xs hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all shrink-0"
                  >
                    {t("see_all")} »
                  </Link>
                </div>

                {/* Desktop 6-Column Grid with max-h-[calc(100vh-160px)] and custom-scrollbar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredCategories.map((cat) => (
                    <Link
                      key={`nav-cat-${cat.id || cat.name}`}
                      href={`/search?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => {
                        setShowCategoryDropdown(false);
                        setCategoryFilter("");
                      }}
                      className="group flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/60 hover:bg-orange-500 hover:border-orange-500 dark:hover:bg-primary dark:hover:border-orange-500 transition-all cursor-pointer"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-white truncate">
                        {cat.name}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-white shrink-0" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <QuickSearchModal isOpen={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} />
    </header>
  );
};

export default Header;
