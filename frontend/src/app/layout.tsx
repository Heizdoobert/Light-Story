import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Providers } from "./providers";
import { getGatewayUrl } from "@/lib/utils/gateway-url";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

function resolveMetadataBase(): URL {
  if (process.env.NODE_ENV !== "production") {
    return new URL("http://localhost:3000");
  }
  if (siteUrl) {
    return new URL(siteUrl);
  }
  const fallback =
    process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN ||
    process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION ||
    "https://lightstory.app";
  return new URL(fallback.startsWith("http") ? fallback : `https://${fallback}`);
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "Light Story - Read Manga, Manhua & Light Novels Online",
    template: "%s | Light Story",
  },
  description: "Read high-quality Manga, Manhua, Manhwa, and Light Novels online on Light Story.",
  openGraph: {
    type: "website",
    locale: "en_US",
    ...(siteUrl ? { url: siteUrl } : {}),
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

let gatewayUrl: string | null = null;
try {
  gatewayUrl = getGatewayUrl();
} catch {
  // preconnect is optional; missing env must not crash the layout
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      style={{ "--font-sans": '"Plus Jakarta Sans Variable"' } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
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
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        {gatewayUrl ? <link rel="preconnect" href={gatewayUrl} /> : null}
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <main className="flex-grow">{children}</main>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
