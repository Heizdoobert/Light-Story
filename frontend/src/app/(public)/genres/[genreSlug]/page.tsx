import { notFound } from 'next/navigation';
import { SearchPageContent } from '@/components/comics/SearchPageContent';
import { getServerSupabase } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ genreSlug: string }>;
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

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
