/**
 *  @type {import('next').NextConfig}
 *  */
const nextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http://localhost:* https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.workers.dev https://*.supabase.co https://placehold.co; connect-src 'self' http://localhost:* https://*.workers.dev https://*.supabase.co wss://*.supabase.co https://va.vercel.com ${process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || "https://unified-gateway.truyen3new.workers.dev"}; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
