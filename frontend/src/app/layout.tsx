import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "@/components/navigation/Footer";
import { AdZoneColumns } from "@/components/shared/ads/AdZoneColumns";

export const metadata: Metadata = {
  title: "Light Story",
  description: "Light Story application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <link rel="preconnect" href={process.env.NODE_ENV === 'production' ? (process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || 'https://unified-gateway.truyen3new.workers.dev') : (process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787')} />
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
