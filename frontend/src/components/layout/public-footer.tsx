'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUp,
  Globe,
  Users,
  ShieldCheck,
  Compass,
  User,
  FileCheck2,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';
import { useLanguage } from '@/context/LanguageContext';

export default function PublicFooter() {
  const pathname = usePathname();
  const { language, t } = useLanguage();

  // Hide footer on admin routes
  if (pathname?.startsWith(ROUTES.ADMIN.ROOT)) return null;

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="w-full bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 mt-auto transition-colors text-slate-600 dark:text-slate-400">
      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand & Community (Takes 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href={ROUTES.HOME} className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm shadow-orange-500/25 group-hover:scale-105 transition-transform">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                  Light<span className="text-orange-500">Story</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                  Manga & Webtoon
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {t('footer_about')}
            </p>

            {/* System Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{t('footer_system_status')}</span>
              <ShieldCheck size={13} className="text-emerald-500 shrink-0 ml-0.5" />
            </div>

            {/* Social & Community Links */}
            <div className="pt-1 flex items-center gap-2.5">
              <Link
                href={ROUTES.FANPAGE}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all cursor-pointer shadow-2xs"
                title={t('nav_fanpage')}
              >
                <Globe size={14} className="text-orange-500" />
                <span>Fanpage</span>
              </Link>
              <Link
                href={ROUTES.GROUP}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all cursor-pointer shadow-2xs"
                title={t('nav_group')}
              >
                <Users size={14} className="text-orange-500" />
                <span>{language === 'VI' ? 'Nhóm độc giả' : 'Group'}</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Compass size={14} className="text-orange-500" />
              <span>{t('footer_explore')}</span>
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href={ROUTES.HOME}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('nav_home')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.GENRES}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('category_list_title')}
                </Link>
              </li>
              <li>
                <Link
                  href={`${ROUTES.SEARCH}?sort=most_viewed`}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('nav_rankings')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.SEARCH}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('nav_search_comics')}
                </Link>
              </li>
              <li>
                <Link
                  href={`${ROUTES.SEARCH}?sort=newest`}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {language === 'VI' ? 'Truyện mới cập nhật' : 'Newly Updated'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Personal & Tools */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <User size={14} className="text-orange-500" />
              <span>{t('footer_personal')}</span>
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href={ROUTES.USER.FAVORITES}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('nav_bookmarks')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.USER.PROFILE}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {language === 'VI' ? 'Hồ sơ người dùng' : 'User Profile'}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.LOGIN}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('login')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.REGISTER}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {language === 'VI' ? 'Đăng ký tài khoản' : 'Register Account'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCheck2 size={14} className="text-orange-500" />
              <span>{t('footer_legal')}</span>
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href={ROUTES.HOME}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('footer_terms')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.HOME}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('footer_privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.HOME}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('footer_dmca')}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.GROUP}
                  className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  {t('footer_contact')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sub-Footer / Copyright & Back to Top */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left">
            <p className="font-medium text-slate-500 dark:text-slate-400">
              © 2026 LightStory. {t('footer_all_rights')}
            </p>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Edge powered by Cloudflare Workers & Supabase
            </p>
          </div>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            aria-label={t('footer_back_to_top')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white dark:hover:bg-primary dark:hover:text-white text-slate-600 dark:text-slate-300 transition-all font-semibold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <span>{t('footer_back_to_top')}</span>
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
}
