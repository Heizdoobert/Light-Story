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
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationBell } from "@/components/user/NotificationBell";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/apiClient";
import { Category } from "@/types/entities";
import { ComicContext as Comic } from "@/services/comics/comic.service";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import { getFallbackAvatar, proxyAvatarUrl } from "@/lib/auth/securityUtils";

const STAFF_ROLES = new Set(["superadmin", "admin", "employee"]);

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.has(role ?? "");
}

type HeaderProps = {
  onLoginClick: () => void;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Action", created_at: "", updated_at: "" },
  { id: "2", name: "Adventure", created_at: "", updated_at: "" },
  { id: "3", name: "Anime", created_at: "", updated_at: "" },
  { id: "4", name: "Chuyển Sinh", created_at: "", updated_at: "" },
  { id: "5", name: "Comedy", created_at: "", updated_at: "" },
  { id: "6", name: "Comic", created_at: "", updated_at: "" },
  { id: "7", name: "Drama", created_at: "", updated_at: "" },
  { id: "8", name: "Fantasy", created_at: "", updated_at: "" },
  { id: "9", name: "Horror", created_at: "", updated_at: "" },
  { id: "10", name: "Isekai", created_at: "", updated_at: "" },
  { id: "11", name: "Manhua", created_at: "", updated_at: "" },
  { id: "12", name: "Manhwa", created_at: "", updated_at: "" },
  { id: "13", name: "Martial Arts", created_at: "", updated_at: "" },
  { id: "14", name: "Mystery", created_at: "", updated_at: "" },
  { id: "15", name: "Romance", created_at: "", updated_at: "" },
  { id: "16", name: "School Life", created_at: "", updated_at: "" },
  { id: "17", name: "Sci-fi", created_at: "", updated_at: "" },
  { id: "18", name: "Shounen", created_at: "", updated_at: "" },
  { id: "19", name: "Slice of Life", created_at: "", updated_at: "" },
  { id: "20", name: "Supernatural", created_at: "", updated_at: "" },
];

export const Header: React.FC<HeaderProps> = ({
  onLoginClick,
}) => {
  const router = useRouter();
  const { user, profile, signOut, role } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Comic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const getComicCover = (comic: Comic) => {
    const raw = comic.coverUrl || (comic as any).cover_url || "";
    if (!raw) return "https://placehold.co/400x600/png?text=No+Cover";
    return proxiedR2ImageUrl(raw);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(false);
    if (searchKeyword.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      router.push("/search");
    }
  };

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
        const res = await apiClient.get<any>(`/api/comics?keyword=${encodeURIComponent(trimmed)}&limit=6`).catch(() => null);
        const items = Array.isArray(res) ? res : res?.items || res?.comics || res?.data || [];
        setSearchResults(items);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent scroll when mobile menu is open
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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.get<any>("/api/categories").catch(() => []);
        if (Array.isArray(res)) {
          setCategories(res);
        } else if (res?.items) {
          setCategories(res.items);
        } else if (res?.data) {
          setCategories(res.data);
        }
      } catch {
        // quiet fallback
      }
    };
    void loadCategories();
  }, []);

  const bounceClick = {
    whileTap: { scale: 0.92 },
    whileHover: { scale: 1.05 },
  };

  const toggleLanguage = () => {
    const nextLang = language === "VI" ? "EN" : "VI";
    setLanguage(nextLang);
    toast.success(nextLang === "VI" ? "Đã chuyển sang Tiếng Việt (VI)" : "Switched to English (EN)");
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#000b13] text-slate-800 dark:text-white shadow-md border-b border-slate-200 dark:border-white/10 transition-colors">
      <nav className="px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <motion.button
            {...bounceClick}
            onClick={() => setShowMobileMenu(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-300 hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-all duration-300 shrink-0"
          >
            <Menu size={22} />
          </motion.button>

          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity cursor-pointer outline-none shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 dark:from-[#001eff] dark:to-[#8900ff] rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
              L
            </div>
            <span className="font-black text-xl sm:text-2xl tracking-tighter text-slate-800 dark:text-white">
              Light<span className="text-orange-500 dark:text-[#ff008d]">Story</span>
            </span>
          </Link>
        </div>

        {/* Header Center Search Box with Live Dropdown */}
        {/* Mobile search icon */}
        <button
          onClick={() => router.push("/search")}
          className="flex sm:hidden p-2.5 rounded-full bg-slate-100 dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-300 hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-all shrink-0"
          title={t("search")}
        >
          <Search size={18} />
        </button>

        <div ref={searchContainerRef} className="relative hidden sm:flex items-center w-80 mx-4">
          <form onSubmit={handleSearchSubmit} className="w-full flex items-center">
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true);
                }}
                placeholder={language === "VI" ? "Tìm kiếm truyện..." : "Search comics..."}
                className="w-full pl-4 pr-10 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#1c1c1c] text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-[#001eff] transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 bg-orange-500 dark:bg-[#001eff] hover:bg-orange-600 dark:hover:bg-[#8900ff] text-white rounded-full transition-colors flex items-center justify-center shrink-0"
                title={t("search")}
              >
                {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
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
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                {isSearching && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-orange-500 dark:text-[#ff008d]" />
                    <span>{language === "VI" ? "Đang tìm kiếm..." : "Searching..."}</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    {language === "VI" ? "Không tìm thấy truyện nào." : "No comics found."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/10 max-h-80 overflow-y-auto">
                    {searchResults.map((comic) => (
                      <Link
                        key={`search-res-${comic.id}`}
                        href={`/comics/${comic.id}`}
                        onClick={() => setShowResults(false)}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-[#000b13] transition-colors group"
                      >
                        <img
                          src={getComicCover(comic)}
                          alt={comic.title}
                          className="w-10 h-14 rounded object-cover border border-slate-200 dark:border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400x600/png?text=No+Cover";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-orange-500 dark:group-hover:text-[#39ff14] transition-colors line-clamp-1">
                            {comic.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {comic.author || (language === "VI" ? "Đang cập nhật" : "Updating")}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={`/search?keyword=${encodeURIComponent(searchKeyword.trim())}`}
                      onClick={() => setShowResults(false)}
                      className="block p-2.5 text-center text-xs font-bold text-orange-500 dark:text-[#ff008d] bg-slate-50 dark:bg-[#000b13] hover:underline"
                    >
                      {language === "VI" ? `Xem tất cả kết quả cho "${searchKeyword}" »` : `See all results for "${searchKeyword}" »`}
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Switcher */}
          <motion.button
            {...bounceClick}
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#1c1c1c] text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-all shrink-0 cursor-pointer"
            title={language === "VI" ? "Switch to English (EN)" : "Chuyển sang Tiếng Việt (VI)"}
          >
            <Globe size={14} className="text-orange-500 dark:text-[#39ff14]" />
            <span>{language}</span>
          </motion.button>

          {/* Theme Toggle Button (Light/Dark) */}
          <motion.button
            {...bounceClick}
            onClick={toggleTheme}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-200 hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-all shrink-0 cursor-pointer"
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
            {theme === "light" ? <Moon size={16} className="text-slate-700" /> : <Sun size={16} className="text-[#39ff14]" />}
          </motion.button>

          {/* Notification Bell with unread dot & dropdown */}
          <NotificationBell />

          {user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              {isStaffRole(role) && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-orange-500 dark:bg-[#001eff] hover:bg-orange-600 dark:hover:bg-[#8900ff] text-white rounded-full text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden lg:block">{t("admin_dashboard")}</span>
                </Link>
              )}
              <div className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-slate-200 dark:border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 max-w-30">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[11px] font-black text-orange-500 dark:text-[#ff008d] uppercase tracking-wider">
                    {role}
                  </div>
                </div>
                
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="relative focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-[#001eff] rounded-full overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <img
                      src={proxyAvatarUrl(profile?.avatar_url) || getFallbackAvatar(profile?.full_name || "User")}
                      alt="Avatar"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-orange-500 dark:border-[#001eff] object-cover"
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
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1c1c1c] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10 sm:hidden">
                          <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                            {profile?.full_name || user.email?.split("@")[0]}
                          </div>
                          <div className="text-[10px] font-black text-orange-500 dark:text-[#ff008d] uppercase tracking-wider">
                            {role}
                          </div>
                        </div>

                        {isStaffRole(role) && (
                          <Link
                            href="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#000b13] transition-colors flex items-center gap-2 sm:hidden"
                          >
                            <LayoutDashboard size={16} />
                            {t("admin_dashboard")}
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#000b13] transition-colors flex items-center gap-2"
                        >
                          <Users size={16} />
                          User Settings
                        </Link>
                        <div className="h-px bg-slate-100 dark:bg-white/10 my-1" />
                        <button
                          onClick={async () => {
                            setIsUserMenuOpen(false);
                            await signOut();
                            toast.success(t("logout_success"));
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-[#000b13] transition-colors flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          {t("logout")}
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
              onClick={onLoginClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 dark:from-[#001eff] dark:to-[#8900ff] text-white rounded-full font-bold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">{t("login")}</span>
            </motion.button>
          )}
        </div>
      </nav>

      {/* TruyenQQ Style Navigation Bar */}
      <div className="relative bg-slate-100 dark:bg-[#1c1c1c] text-slate-800 dark:text-white border-t border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 lg:px-12 transition-colors" ref={categoryDropdownRef}>
        <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar font-bold text-xs uppercase tracking-wide py-1.5">
          {/* Trang chủ */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
            title={t("nav_home")}
          >
            <Home size={16} />
          </Link>

          {/* THỂ LOẠI Toggle Button */}
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <Menu size={16} />
            <span>{t("nav_categories_title")}</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${
                showCategoryDropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* XẾP HẠNG */}
          <Link
            href="/search?sort=most_viewed"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <BarChart2 size={16} />
            <span>{t("nav_rankings")}</span>
          </Link>

          {/* TÌM TRUYỆN */}
          <Link
            href="/search"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <Search size={16} />
            <span>{t("nav_search_comics")}</span>
          </Link>

          {/* THEO DÕI */}
          <Link
            href="/bookmarks"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <Bookmark size={16} />
            <span>{t("nav_bookmarks")}</span>
          </Link>

          {/* HỒ SƠ */}
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <User size={16} />
            <span>{language === "VI" ? "HỒ SƠ" : "PROFILE"}</span>
          </Link>

          {/* GROUP */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <Users size={16} />
            <span>{t("nav_group")}</span>
          </a>

          {/* FANPAGE */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500 dark:hover:bg-[#001eff] hover:text-white transition-colors shrink-0"
          >
            <Globe size={16} />
            <span>{t("nav_fanpage")}</span>
          </a>
        </div>

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {showMobileMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileMenu(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-[#000b13] z-[90] shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 dark:from-[#001eff] dark:to-[#8900ff] rounded-full flex shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
                      L
                    </div>
                    <span className="font-black text-xl tracking-tighter text-slate-800 dark:text-white">
                      Light<span className="text-orange-500 dark:text-[#ff008d]">Story</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 bg-slate-100 dark:bg-[#1c1c1c] text-slate-500 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-6">
                  {/* Mobile Navigation Links */}
                  <div className="flex flex-col gap-2">
                    <Link href="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c1c1c] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                      <Home size={20} className="text-slate-400 dark:text-slate-500" /> {t("nav_home")}
                    </Link>
                    <Link href="/search?sort=most_viewed" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c1c1c] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                      <BarChart2 size={20} className="text-slate-400 dark:text-slate-500" /> {t("nav_rankings")}
                    </Link>
                    <Link href="/search" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c1c1c] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                      <Search size={20} className="text-slate-400 dark:text-slate-500" /> {t("nav_search_comics")}
                    </Link>
                    <Link href="/bookmarks" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c1c1c] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                      <Bookmark size={20} className="text-slate-400 dark:text-slate-500" /> {t("nav_bookmarks")}
                    </Link>
                    <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c1c1c] font-bold text-slate-700 dark:text-slate-200 transition-colors">
                      <User size={20} className="text-slate-400 dark:text-slate-500" /> {language === "VI" ? "Hồ Sơ" : "Profile"}
                    </Link>
                  </div>
                  
                  {/* Mobile Categories Grid */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-400 dark:text-slate-500 mb-3 px-3">
                      {t("category_list_title")}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map(cat => (
                        <Link 
                          key={`mob-cat-${cat.id}`} 
                          href={`/search?category=${encodeURIComponent(cat.name)}`} 
                          onClick={() => setShowMobileMenu(false)} 
                          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1c1c1c] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-500 dark:hover:text-orange-400 transition-colors truncate text-center"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Category Table Megamenu Popover (Outside overflow-x-auto) */}
        <AnimatePresence>
          {showCategoryDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[92vw] sm:w-[650px] lg:w-[840px] max-w-4xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-4 sm:p-5 normal-case text-xs"
            >
              {/* Table Header Badge */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-[#ff008d] animate-pulse"></span>
                  <span className="font-bold text-sm text-slate-800 dark:text-white tracking-wide">
                    {t("category_list_title")}
                  </span>
                </div>
                <Link
                  href="/search"
                  onClick={() => setShowCategoryDropdown(false)}
                  className="px-3 py-1 bg-orange-50 dark:bg-[#000b13] text-orange-600 dark:text-[#ff008d] rounded-full font-bold text-xs hover:bg-orange-500 hover:text-white dark:hover:bg-[#001eff] dark:hover:text-white transition-colors"
                >
                  {t("see_all")}
                </Link>
              </div>

              {/* 6-Column Category Grid Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
                {categories.map((cat) => (
                  <Link
                    key={`nav-cat-${cat.id || cat.name}`}
                    href={`/search?category=${encodeURIComponent(cat.name)}`}
                    onClick={() => setShowCategoryDropdown(false)}
                    className="group flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#000b13]/60 hover:bg-orange-500 dark:hover:bg-[#001eff] hover:border-orange-500 dark:hover:border-[#001eff] transition-all"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-white truncate">
                      {cat.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-white shrink-0"></span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
