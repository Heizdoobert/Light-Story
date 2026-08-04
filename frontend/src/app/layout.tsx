import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN ||
      "http://localhost:3000"
  ),
  title: "Light Story - Đọc Truyện Tranh Online",
  description:
    "Trang đọc truyện tranh Manga, Manhua, Manhwa trực tuyến chất lượng cao.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={roboto.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
