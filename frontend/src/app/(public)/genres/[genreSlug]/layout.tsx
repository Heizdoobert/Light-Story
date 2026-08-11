import type { Metadata } from 'next';

type Props = {
  params: Promise<{ genreSlug: string }>;
};

function capitalize(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { genreSlug } = await params;
  const name = capitalize(genreSlug);
  return {
    title: `${name} - Truyện Tranh Thể Loại | Light Story`,
    description: `Khám phá các bộ truyện tranh thể loại ${name} mới nhất tại Light Story.`,
  };
}

export default function GenreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}