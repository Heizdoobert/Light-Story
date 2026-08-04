import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN || 'http://localhost:3001';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/user', '/dashboard', '/profile', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
