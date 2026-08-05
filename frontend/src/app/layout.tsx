import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "@/components/navigation/Footer";
import { AdZoneColumns } from "@/components/shared/ads/AdZoneColumns";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lightstory.org';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Light Story - Read Manga, Manhua & Light Novels Online",
    template: "%s | Light Story",
  },
  description: "Read high-quality Manga, Manhua, Manhwa, and Light Novels online on Light Story.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Light Story",
    title: "Light Story - Read Manga & Light Novels",
    description: "Read high-quality Manga, Manhua, Manhwa, and Light Novels online.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Light Story",
    description: "Read high-quality Manga, Manhua, Manhwa, and Light Novels online.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      style={{ "--font-sans": '"Plus Jakarta Sans Variable"' } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {/* Inject theme-setting script to prevent dark mode FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  const theme = (saved === 'light' || saved === 'dark') 
                    ? saved 
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.add(theme);
                } catch (e) {
                  // Fallback if localStorage is unavailable
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
        <link rel="preconnect" href={process.env.NODE_ENV === 'production' ? (process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || 'https://kv-worker.hhhuygiau.workers.dev') : (process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787')} />
      </head>
      {/* Thêm class để body chiếm tối thiểu 100% chiều cao màn hình và dàn dọc */}
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <AdZoneColumns />
          {/* Main sẽ đẩy Footer xuống dưới cùng nhờ flex-grow */}
          <main className="flex-grow">{children}</main>
          {/* Footer luôn nằm ở cuối */}
          <Footer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
