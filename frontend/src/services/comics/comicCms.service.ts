import { ROUTES } from "@/lib/constants/routes";

export function proxiedR2ImageUrl(url: string): string {
  if (!url) return "";

  const lowerUrl = url.trim().toLowerCase();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("vbscript:") ||
    lowerUrl.startsWith("data:")
  ) {
    return "";
  }

  const safeUrl = url.split("?")[0].split("#")[0];
  if (safeUrl.includes("../") || safeUrl.includes("..\\")) {
    return "";
  }

  const gateway =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL
      : process.env.NEXT_PUBLIC_GATEWAY_URL;

  if (!gateway) return url;

  if (url.startsWith(ROUTES.API.ADMIN.R2_FILE_PREFIX)) {
    const key = url.slice(ROUTES.API.ADMIN.R2_FILE_PREFIX.length);
    return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(key)}`;
  }

  if (url.startsWith(ROUTES.API.MEDIA_PREFIX)) {
    const path = url.slice(ROUTES.API.MEDIA_PREFIX.length);
    return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(path)}`;
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    if (url.startsWith("/")) {
      return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(url.slice(1))}`;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(url)}`;
    }
    return url;
  }

  const isR2Host = hostname.endsWith(".r2.dev");
  const isCloudflareHost =
    hostname === "cloudflare.com" || hostname.endsWith(".cloudflare.com");

  if (isR2Host || isCloudflareHost) {
    return `${gateway}${ROUTES.API.ADMIN.R2_PROXY_QUERY(url)}`;
  }
  return url;
}
