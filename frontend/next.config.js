/**
 *  @type {import('next').NextConfig}
 */
import { resolve } from 'node:path';

const nextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Turbopack config (empty to silence warning about custom webpack)
  turbopack: {},
  images: {
    minimumCacheTTL: 31536000,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
      "recharts",
      "motion",
      "radix-ui",
      "@supabase/supabase-js",
      "zod",
      "sonner",
    ],
  },
  // Add SDK alias for '@/sdk'
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/sdk': resolve(__dirname, 'packages/sdk/src'),
    };
    return config;
  },
};

export default nextConfig;
