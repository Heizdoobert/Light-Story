import type { MetadataRoute } from 'next';
import { ROUTES } from '@/lib/constants/routes';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // ponytail: '/profile' kept — public-by-design redirect, intentional
        disallow: [ROUTES.ADMIN.ROOT, ROUTES.USER.ROOT, '/profile', '/api/'],
      },
    ],
    ...(BASE_URL ? { sitemap: `${BASE_URL}/sitemap.xml` } : {}),
  };
}
