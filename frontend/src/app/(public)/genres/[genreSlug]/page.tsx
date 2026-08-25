import { notFound } from 'next/navigation';
import { SearchPageContent } from '@/components/comics/SearchPageContent';
import { getServerSupabase } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ genreSlug: string }>;
};

import { normalizeName } from '@/lib/utils/slug';

export default async function GenreDetailPage({ params }: Props) {
  const { genreSlug } = await params;

  let matchedName: string | undefined;
  try {
    const db = getServerSupabase();
    if (db) {
      const { data } = await db.from('categories').select('id, name');
      const categories = (data ?? []) as { id: string; name: string }[];
      const match = categories.find(
        (category) => normalizeName(category.name) === normalizeName(genreSlug),
      );
      if (match) matchedName = match.name;
    }
  } catch {
    // categories unreachable -> unresolved slug renders the 404 page
  }

  if (!matchedName) notFound();

  return <SearchPageContent initialCategory={matchedName} />;
}
