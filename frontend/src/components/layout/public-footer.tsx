'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/constants/routes';
import { useLanguage } from '@/context/LanguageContext';

export default function PublicFooter() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname?.startsWith(ROUTES.ADMIN.ROOT)) return null;

  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 py-4 mt-auto transition-colors">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
        <div>
          <Link href="/">
            <h3 className="font-black text-lg text-slate-900 dark:text-white">
              Light<span className="text-primary">Story</span>
            </h3>
          </Link>
          <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm leading-relaxed">
            {t("footer_about")}
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-600">© 2026 LightStory. All rights reserved.</p>
      </div>
    </footer>
  );
}
