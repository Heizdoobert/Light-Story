"use client";

import Link from 'next/link';

export interface GenreBadgeProps {
  name: string;
  slug: string;
}

export function GenreBadge({ name, slug }: GenreBadgeProps) {
  return (
    <Link
      href={`/genres/${slug}`}
      className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-full hover:bg-orange-500 hover:text-white transition-colors"
    >
      {name}
    </Link>
  );
}

export default GenreBadge;
