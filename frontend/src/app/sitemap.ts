import type { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { ROUTES } from '@/lib/constants/routes';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}${ROUTES.COMICS}`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}${ROUTES.LOGIN}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}${ROUTES.REGISTER}`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let comicRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await getServerSupabase();
    if (supabase) {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(500);

      if (stories) {
        comicRoutes = stories.map((story) => ({
          url: `${BASE_URL}${ROUTES.COMIC_DETAIL(story.id)}`,
          lastModified: story.updated_at ? new Date(story.updated_at) : new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
      }
    }
  } catch {
    comicRoutes = [];
  }

  return [...staticRoutes, ...comicRoutes];
}
